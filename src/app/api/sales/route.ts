import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Sale, Product, Contact, nextSeq, Business } from "@/models";
import { generateDocNo } from "@/lib/utils";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
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
  const body = await req.json();
  const business = await Business.findOne();
  const seq = await nextSeq("sale");
  const invoiceNo = generateDocNo(business?.invoicePrefix || "DIT", seq);

  const items = (body.items || []).map(
    (it: {
      productId: string;
      name: string;
      sku?: string;
      unit?: string;
      qty: number;
      bonusQty?: number;
      unitPrice: number;
      discount?: number;
      taxPercent?: number;
    }) => {
      const qty = Number(it.qty);
      const unitPrice = Number(it.unitPrice);
      const discount = Number(it.discount || 0);
      const taxPercent = Number(it.taxPercent || 0);
      const base = qty * unitPrice - discount;
      const lineTotal = base + (base * taxPercent) / 100;
      return {
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        unit: it.unit || "Pcs",
        qty,
        bonusQty: Number(it.bonusQty || 0),
        unitPrice,
        discount,
        taxPercent,
        lineTotal,
      };
    },
  );

  const subtotal = items.reduce(
    (a: number, i: { qty: number; unitPrice: number }) => a + i.qty * i.unitPrice,
    0,
  );
  const discount = Number(body.discount || 0);
  const tax = Number(body.tax || 0);
  const shipping = Number(body.shipping || 0);
  const grandTotal = subtotal - discount + tax + shipping;
  const payments = body.payments || [];
  const paidAmount = payments.reduce(
    (a: number, p: { amount: number }) => a + Number(p.amount || 0),
    0,
  );
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const sale = await Sale.create(
      [
        {
          invoiceNo,
          status: body.status || "final",
          locationId: body.locationId,
          customerId: body.customerId || undefined,
          customerName: body.customerName || "Walk-in Customer",
          customerMobile: body.customerMobile,
          customerAddress: body.customerAddress,
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
        },
      ],
      { session: mongoSession },
    );

    if ((body.status || "final") === "final" && body.locationId) {
      for (const it of items) {
        const deduct = it.qty + (it.bonusQty || 0);
        await Product.updateOne(
          { _id: it.productId, "stocks.locationId": body.locationId },
          { $inc: { "stocks.$.qty": -deduct } },
          { session: mongoSession },
        );
      }
      if (body.customerId && dueAmount > 0) {
        await Contact.updateOne(
          { _id: body.customerId },
          { $inc: { balance: dueAmount } },
          { session: mongoSession },
        );
      }
    }

    await mongoSession.commitTransaction();
    return NextResponse.json({ data: sale[0] }, { status: 201 });
  } catch (e) {
    await mongoSession.abortTransaction();
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  } finally {
    mongoSession.endSession();
  }
}
