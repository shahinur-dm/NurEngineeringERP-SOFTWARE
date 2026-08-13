import { NextRequest, NextResponse } from "next/server";
import { connectDB, runInTransaction } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Sale, Product, Contact } from "@/models";
import {
  DEFAULT_QUOTATION_TERMS,
  ensureSaleNumberIndexes,
  nextInvoiceNo,
  nextQuotationNo,
  nextReferenceNo,
  nextSalesOrderNo,
} from "@/lib/doc-numbers";
import { calcDueAmount, roundMoney } from "@/lib/sale-finance";
import { ensureDeliveryChallan } from "@/lib/delivery-challan";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  await ensureSaleNumberIndexes();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const locationId = searchParams.get("locationId");
  const customerId = searchParams.get("customerId");
  const status = searchParams.get("status");
  const paymentMethod = searchParams.get("paymentMethod");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  const filter: Record<string, unknown> = {};
  if (from || to) {
    filter.saleDate = {};
    if (from) (filter.saleDate as Record<string, Date>).$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      (filter.saleDate as Record<string, Date>).$lte = end;
    }
  }
  if (locationId) filter.locationId = locationId;
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  if (paymentMethod) filter["payments.method"] = paymentMethod;
  if (q) {
    filter.$or = [
      { invoiceNo: new RegExp(q, "i") },
      { quotationNo: new RegExp(q, "i") },
      { salesOrderNo: new RegExp(q, "i") },
      { referenceNo: new RegExp(q, "i") },
      { customerName: new RegExp(q, "i") },
      { customerMobile: new RegExp(q, "i") },
    ];
  }

  const [data, total, aggregates] = await Promise.all([
    Sale.find(filter)
      .sort({ saleDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
    Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          grandTotal: { $sum: "$grandTotal" },
          paidAmount: { $sum: "$paidAmount" },
          dueAmount: { $sum: "$dueAmount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    summary: aggregates[0] || { grandTotal: 0, paidAmount: 0, dueAmount: 0, count: 0 },
  });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  await ensureSaleNumberIndexes();
  const body = await req.json();
  const status = body.status || "final";

  const items = (body.items || []).map(
    (it: {
      productId: string;
      name: string;
      sku?: string;
      unit?: string;
      description?: string;
      imageUrl?: string;
      qty: number;
      bonusQty?: number;
      unitPrice: number;
      discount?: number;
      taxPercent?: number;
    }) => {
      const qty = Number(it.qty);
      const unitPrice = roundMoney(it.unitPrice);
      const discount = roundMoney(it.discount || 0);
      const taxPercent = Number(it.taxPercent || 0);
      const base = qty * unitPrice - discount;
      const lineTotal = roundMoney(base + (base * taxPercent) / 100);
      return {
        productId: it.productId,
        name: String(it.name || "").trim() || it.sku || "Item",
        sku: it.sku,
        unit: it.unit || "Pcs",
        description: it.description != null ? String(it.description) : "",
        imageUrl: it.imageUrl ? String(it.imageUrl) : "",
        qty,
        bonusQty: Number(it.bonusQty || 0),
        unitPrice,
        discount,
        taxPercent,
        lineTotal,
      };
    },
  );

  const missingImages = items.filter((it: { productId: string; imageUrl?: string }) => it.productId && !it.imageUrl);
  if (missingImages.length) {
    const masters = await Product.find({
      _id: { $in: missingImages.map((it: { productId: string }) => it.productId) },
    })
      .select("imageUrl")
      .lean();
    const byId = new Map(masters.map((p) => [String(p._id), p.imageUrl || ""]));
    for (const it of items) {
      if (!it.imageUrl) it.imageUrl = byId.get(String(it.productId)) || "";
    }
  }

  const subtotal = roundMoney(
    items.reduce(
      (a: number, i: { qty: number; unitPrice: number }) => a + i.qty * i.unitPrice,
      0,
    ),
  );
  const discount = roundMoney(body.discount || 0);
  const tax = roundMoney(body.tax || 0);
  const shipping = roundMoney(body.shipping || 0);
  const grandTotal = roundMoney(subtotal - discount + tax + shipping);
  const payments = body.payments || [];
  const paidAmount = roundMoney(
    payments.reduce(
      (a: number, p: { amount: number }) => a + Number(p.amount || 0),
      0,
    ),
  );
  const dueAmount = calcDueAmount(grandTotal, paidAmount);

  const referenceNo = body.referenceNo || (await nextReferenceNo());
  const quotationNo =
    status === "quotation" ? body.quotationNo || (await nextQuotationNo()) : body.quotationNo || undefined;
  const salesOrderNo =
    status === "final" ? body.salesOrderNo || (await nextSalesOrderNo()) : body.salesOrderNo || undefined;
  const invoiceNo =
    status === "final" ? body.invoiceNo || (await nextInvoiceNo()) : body.invoiceNo || undefined;

  let customerName = body.customerName || "Walk-in Customer";
  let customerMobile = body.customerMobile || "";
  let customerAddress = body.customerAddress || "";
  if (body.customerId) {
    const contact = await Contact.findById(body.customerId).lean();
    if (contact) {
      customerName = contact.name || customerName;
      customerMobile = customerMobile || contact.mobile || "";
      customerAddress = customerAddress || contact.address || "";
    }
  }

  const payload: Record<string, unknown> = {
    referenceNo,
    poNo: body.poNo,
    poDate: body.poDate ? new Date(body.poDate) : undefined,
    subject: body.subject || body.note,
    terms: status === "quotation" ? body.terms || DEFAULT_QUOTATION_TERMS : body.terms,
    status,
    locationId: body.locationId,
    customerId: body.customerId || undefined,
    customerName,
    customerMobile,
    customerAddress,
    items,
    subtotal,
    discount,
    tax,
    shipping,
    grandTotal,
    paidAmount,
    dueAmount,
    payments,
    note: body.note,
    staffNote: body.staffNote,
    soldBy: session.id,
    soldByName: session.name,
    saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
  };
  if (invoiceNo) payload.invoiceNo = invoiceNo;
  if (quotationNo) payload.quotationNo = quotationNo;
  if (salesOrderNo) payload.salesOrderNo = salesOrderNo;

  try {
    const created = await runInTransaction(async (mongoSession) => {
      const sale = mongoSession
        ? (await Sale.create([payload], { session: mongoSession }))[0]
        : await Sale.create(payload);

      if (status === "final") {
        if (body.locationId) {
          for (const it of items) {
            const deduct = it.qty + (it.bonusQty || 0);
            await Product.updateOne(
              { _id: it.productId, "stocks.locationId": body.locationId },
              { $inc: { "stocks.$.qty": -deduct } },
              mongoSession ? { session: mongoSession } : {},
            );
          }
        }
        if (body.customerId && dueAmount > 0) {
          await Contact.updateOne(
            { _id: body.customerId },
            { $inc: { balance: dueAmount } },
            mongoSession ? { session: mongoSession } : {},
          );
        }
        await ensureDeliveryChallan(sale, mongoSession);
      }

      return sale;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
