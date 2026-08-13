import { NextRequest, NextResponse } from "next/server";
import { connectDB, runInTransaction } from "@/lib/db";
import { Contact, Sale } from "@/models";
import { canWrite, requireSession } from "@/lib/rbac";
import { calcDueAmount, paymentStatusFromAmounts, roundMoney } from "@/lib/sale-finance";

const METHODS = ["cash", "card", "bkash", "nagad", "rocket", "cheque", "bank", "credit"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { session, error } = await requireSession();
  if (error || !session) return error!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  await connectDB();
  const body = await req.json();
  const amount = roundMoney(body.amount);
  const method = String(body.method || "cash");
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return NextResponse.json({ error: "invalid_method" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const existing = await Sale.findById(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const due = calcDueAmount(existing.grandTotal || 0, existing.paidAmount || 0);
  if (amount > due) {
    return NextResponse.json({ error: "exceeds_due" }, { status: 400 });
  }

  try {
    const sale = await runInTransaction(async (mongoSession) => {
      const doc = mongoSession
        ? await Sale.findById(id).session(mongoSession)
        : await Sale.findById(id);
      if (!doc) throw new Error("not_found");

      doc.payments.push({
        method,
        amount,
        reference: body.reference ? String(body.reference) : undefined,
        note: body.note ? String(body.note) : undefined,
        paidAt: new Date(),
      });
      doc.paidAmount = roundMoney(Number(doc.paidAmount || 0) + amount);
      doc.dueAmount = calcDueAmount(doc.grandTotal || 0, doc.paidAmount);
      await doc.save(mongoSession ? { session: mongoSession } : undefined);

      if (doc.customerId) {
        await Contact.updateOne(
          { _id: doc.customerId },
          { $inc: { balance: -amount } },
          mongoSession ? { session: mongoSession } : {},
        );
      }
      return doc;
    });

    return NextResponse.json({
      data: sale,
      paymentStatus: paymentStatusFromAmounts(sale.grandTotal || 0, sale.paidAmount || 0),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
