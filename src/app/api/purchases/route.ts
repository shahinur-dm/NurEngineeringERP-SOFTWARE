import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Purchase, Product, Contact, Business, nextSeq } from "@/models";
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
  const supplierId = searchParams.get("supplierId");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Number(searchParams.get("limit") || 50));

  const filter: Record<string, unknown> = {};
  if (from || to) {
    filter.purchaseDate = {};
    if (from) (filter.purchaseDate as Record<string, Date>).$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      (filter.purchaseDate as Record<string, Date>).$lte = end;
    }
  }
  if (locationId) filter.locationId = locationId;
  if (supplierId) filter.supplierId = supplierId;
  if (q) {
    filter.$or = [
      { referenceNo: new RegExp(q, "i") },
      { supplierName: new RegExp(q, "i") },
    ];
  }

  const [data, total, summary] = await Promise.all([
    Purchase.find(filter).sort({ purchaseDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Purchase.countDocuments(filter),
    Purchase.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          grandTotal: { $sum: "$grandTotal" },
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
    summary: summary[0] || { grandTotal: 0, dueAmount: 0, count: 0 },
  });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const business = await Business.findOne();
  const seq = await nextSeq("purchase");
  const referenceNo = generateDocNo(business?.purchasePrefix || "PUR", seq);

  const items = (body.items || []).map(
    (it: {
      productId: string;
      name: string;
      sku?: string;
      qty: number;
      unitCost: number;
      batchNo?: string;
      expiryDate?: string;
    }) => ({
      productId: it.productId,
      name: it.name,
      sku: it.sku,
      qty: Number(it.qty),
      unitCost: Number(it.unitCost),
      lineTotal: Number(it.qty) * Number(it.unitCost),
      batchNo: it.batchNo,
      expiryDate: it.expiryDate ? new Date(it.expiryDate) : undefined,
    }),
  );

  const subtotal = items.reduce((a: number, i: { lineTotal: number }) => a + i.lineTotal, 0);
  const discount = Number(body.discount || 0);
  const tax = Number(body.tax || 0);
  const grandTotal = subtotal - discount + tax;
  const payments = body.payments || [];
  const paidAmount = payments.reduce(
    (a: number, p: { amount: number }) => a + Number(p.amount || 0),
    0,
  );
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const purchase = await Purchase.create(
      [
        {
          referenceNo,
          status: body.status || "received",
          locationId: body.locationId,
          supplierId: body.supplierId,
          supplierName: body.supplierName,
          items,
          subtotal,
          discount,
          tax,
          grandTotal,
          paidAmount,
          dueAmount,
          payments,
          note: body.note,
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
          createdBy: session.id,
        },
      ],
      { session: mongoSession },
    );

    if ((body.status || "received") === "received" && body.locationId) {
      for (const it of items) {
        const product = await Product.findById(it.productId).session(mongoSession);
        if (!product) continue;
        const idx = product.stocks.findIndex(
          (s: { locationId?: unknown }) => String(s.locationId) === String(body.locationId),
        );
        if (idx >= 0) {
          product.stocks[idx].qty += it.qty;
          if (it.batchNo) product.stocks[idx].batchNo = it.batchNo;
          if (it.expiryDate) product.stocks[idx].expiryDate = it.expiryDate;
        } else {
          product.stocks.push({
            locationId: body.locationId,
            qty: it.qty,
            batchNo: it.batchNo,
            expiryDate: it.expiryDate,
          });
        }
        product.purchasePrice = it.unitCost;
        await product.save({ session: mongoSession });
      }
      if (body.supplierId && dueAmount > 0) {
        await Contact.updateOne(
          { _id: body.supplierId },
          { $inc: { balance: dueAmount } },
          { session: mongoSession },
        );
      }
    }

    await mongoSession.commitTransaction();
    return NextResponse.json({ data: purchase[0] }, { status: 201 });
  } catch (e) {
    await mongoSession.abortTransaction();
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  } finally {
    mongoSession.endSession();
  }
}
