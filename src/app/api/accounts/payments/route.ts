import { NextRequest, NextResponse } from "next/server";
import { connectDB, runInTransaction } from "@/lib/db";
import { Contact, Purchase, Sale } from "@/models";
import { canWrite, requireSession } from "@/lib/rbac";
import { calcDueAmount, roundMoney } from "@/lib/sale-finance";
import { PURCHASE_POSTED_STATUSES, SALE_POSTED_STATUS } from "@/lib/accounts-books";

const METHODS = ["cash", "card", "bkash", "nagad", "rocket", "cheque", "bank"] as const;

type Kind = "customer" | "supplier";

function paymentStatusPurchase(grand: number, paid: number) {
  const due = calcDueAmount(grand, paid);
  if (due <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Due";
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error!;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") === "supplier" ? "supplier" : "customer") as Kind;
  const contactId = searchParams.get("contactId") || "";

  if (kind === "customer") {
    const filter: Record<string, unknown> = {
      status: SALE_POSTED_STATUS,
      $expr: {
        $gt: [
          { $subtract: [{ $ifNull: ["$grandTotal", 0] }, { $ifNull: ["$paidAmount", 0] }] },
          0.009,
        ],
      },
    };
    if (contactId) filter.customerId = contactId;
    const data = await Sale.find(filter).sort({ saleDate: 1 }).limit(200).lean();
    return NextResponse.json({
      data: data.map((s) => ({
        _id: s._id,
        reference: s.invoiceNo || s.referenceNo,
        party: s.customerName,
        date: s.saleDate,
        grandTotal: s.grandTotal,
        paidAmount: s.paidAmount,
        dueAmount: calcDueAmount(s.grandTotal || 0, s.paidAmount || 0),
      })),
    });
  }

  const filter: Record<string, unknown> = {
    status: { $in: [...PURCHASE_POSTED_STATUSES] },
    $expr: {
      $gt: [
        { $subtract: [{ $ifNull: ["$grandTotal", 0] }, { $ifNull: ["$paidAmount", 0] }] },
        0.009,
      ],
    },
  };
  if (contactId) filter.supplierId = contactId;
  const data = await Purchase.find(filter).sort({ purchaseDate: 1 }).limit(200).lean();
  return NextResponse.json({
    data: data.map((p) => ({
      _id: p._id,
      reference: p.referenceNo,
      party: p.supplierName,
      date: p.purchaseDate,
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      dueAmount: calcDueAmount(p.grandTotal || 0, p.paidAmount || 0),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const kind: Kind = body.kind === "supplier" ? "supplier" : "customer";
  const amount = roundMoney(body.amount);
  const method = String(body.method || "cash");
  const documentId = body.documentId ? String(body.documentId) : "";
  const contactId = body.contactId ? String(body.contactId) : "";
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return NextResponse.json({ error: "invalid_method" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  await connectDB();

  try {
    const result = await runInTransaction(async (mongoSession) => {
      let remaining = amount;
      const applied: { id: string; applied: number }[] = [];

      if (kind === "customer") {
        const q: Record<string, unknown> = { status: SALE_POSTED_STATUS };
        if (documentId) q._id = documentId;
        else if (contactId) q.customerId = contactId;
        else throw new Error("missing_party");
        const docs = mongoSession
          ? await Sale.find(q).sort({ saleDate: 1 }).session(mongoSession)
          : await Sale.find(q).sort({ saleDate: 1 });
        for (const doc of docs) {
          if (remaining <= 0.009) break;
          const due = calcDueAmount(doc.grandTotal || 0, doc.paidAmount || 0);
          if (due <= 0) continue;
          const take = roundMoney(Math.min(remaining, due));
          doc.payments.push({
            method,
            amount: take,
            reference: body.reference ? String(body.reference) : undefined,
            note: body.note ? String(body.note) : "Accounts customer payment",
            paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
          });
          doc.paidAmount = roundMoney(Number(doc.paidAmount || 0) + take);
          doc.dueAmount = calcDueAmount(doc.grandTotal || 0, doc.paidAmount);
          await doc.save(mongoSession ? { session: mongoSession } : undefined);
          if (doc.customerId) {
            await Contact.updateOne(
              { _id: doc.customerId },
              { $inc: { balance: -take } },
              mongoSession ? { session: mongoSession } : {},
            );
          }
          remaining = roundMoney(remaining - take);
          applied.push({ id: String(doc._id), applied: take });
        }
      } else {
        const q: Record<string, unknown> = { status: { $in: [...PURCHASE_POSTED_STATUSES] } };
        if (documentId) q._id = documentId;
        else if (contactId) q.supplierId = contactId;
        else throw new Error("missing_party");
        const docs = mongoSession
          ? await Purchase.find(q).sort({ purchaseDate: 1 }).session(mongoSession)
          : await Purchase.find(q).sort({ purchaseDate: 1 });
        for (const doc of docs) {
          if (remaining <= 0.009) break;
          const due = calcDueAmount(doc.grandTotal || 0, doc.paidAmount || 0);
          if (due <= 0) continue;
          const take = roundMoney(Math.min(remaining, due));
          doc.payments.push({
            method,
            amount: take,
            reference: body.reference ? String(body.reference) : undefined,
            note: body.note ? String(body.note) : "Accounts supplier payment",
            paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
          });
          doc.paidAmount = roundMoney(Number(doc.paidAmount || 0) + take);
          doc.dueAmount = calcDueAmount(doc.grandTotal || 0, doc.paidAmount);
          doc.paymentStatus = paymentStatusPurchase(doc.grandTotal || 0, doc.paidAmount);
          await doc.save(mongoSession ? { session: mongoSession } : undefined);
          if (doc.supplierId) {
            await Contact.updateOne(
              { _id: doc.supplierId },
              { $inc: { balance: -take } },
              mongoSession ? { session: mongoSession } : {},
            );
          }
          remaining = roundMoney(remaining - take);
          applied.push({ id: String(doc._id), applied: take });
        }
      }

      if (!applied.length) throw new Error("no_due");
      if (remaining > 0.009) throw new Error("exceeds_due");
      return { applied, remaining };
    });

    return NextResponse.json({
      data: result,
      paymentStatus: result.applied.map((a) => a.id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    const status = ["missing_party", "no_due", "exceeds_due", "invalid_amount"].includes(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
