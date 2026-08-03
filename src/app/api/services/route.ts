import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ServiceJob, Product, Contact, nextSeq } from "@/models";
import { generateDocNo } from "@/lib/utils";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const customerId = searchParams.get("customerId");
  const technicianId = searchParams.get("technicianId");
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  const filter: Record<string, unknown> = {};
  if (from || to) {
    filter.receivedDate = {};
    if (from) (filter.receivedDate as Record<string, Date>).$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      (filter.receivedDate as Record<string, Date>).$lte = end;
    }
  }
  if (customerId) filter.customerId = customerId;
  if (technicianId) filter.technicianId = technicianId;
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { jobNo: new RegExp(q, "i") },
      { issueDescription: new RegExp(q, "i") },
    ];
  }

  const [data, total] = await Promise.all([
    ServiceJob.find(filter)
      .populate("customerId", "name mobile")
      .populate("machineId", "brand model serialNo")
      .populate("technicianId", "name")
      .sort({ receivedDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ServiceJob.countDocuments(filter),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const seq = await nextSeq("service_job");
  const jobNo = generateDocNo("JOB", seq);

  const parts = (body.parts || []).map(
    (it: { productId: string; name: string; qty: number; unitPrice: number }) => {
      const qty = Number(it.qty);
      const unitPrice = Number(it.unitPrice);
      const lineTotal = qty * unitPrice;
      return {
        productId: it.productId,
        name: it.name,
        qty,
        unitPrice,
        lineTotal,
      };
    },
  );

  const partsTotal = parts.reduce((a: number, i: { lineTotal: number }) => a + i.lineTotal, 0);
  const serviceCharges = Number(body.serviceCharges || 0);
  const discount = Number(body.discount || 0);
  const tax = Number(body.tax || 0);
  
  const grandTotal = partsTotal + serviceCharges - discount + tax;
  const payments = body.payments || [];
  const paidAmount = payments.reduce(
    (a: number, p: { amount: number }) => a + Number(p.amount || 0),
    0,
  );
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const job = await ServiceJob.create(
      [
        {
          jobNo,
          customerId: body.customerId,
          machineId: body.machineId || undefined,
          technicianId: body.technicianId || undefined,
          status: body.status || "pending",
          issueDescription: body.issueDescription,
          serviceCharges,
          parts,
          partsTotal,
          discount,
          tax,
          grandTotal,
          paidAmount,
          dueAmount,
          payments,
          notes: body.notes,
          receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
          expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : undefined,
          warrantyDays: Number(body.warrantyDays || 0),
          createdBy: session.id,
        },
      ],
      { session: mongoSession },
    );

    // If job is created and it consumes parts, we should probably deduct stock.
    // However, usually parts are consumed when job is "completed" or explicitly issued.
    // For simplicity, if status is "completed" or "delivered", deduct stock.
    if ((body.status === "completed" || body.status === "delivered") && body.locationId) {
      for (const it of parts) {
        await Product.updateOne(
          { _id: it.productId, "stocks.locationId": body.locationId },
          { $inc: { "stocks.$.qty": -it.qty } },
          { session: mongoSession },
        );
      }
      
      // Update customer balance if there's due amount
      if (body.customerId && dueAmount > 0) {
        await Contact.updateOne(
          { _id: body.customerId },
          { $inc: { balance: dueAmount } },
          { session: mongoSession },
        );
      }
    }

    await mongoSession.commitTransaction();
    return NextResponse.json({ data: job[0] }, { status: 201 });
  } catch (e) {
    await mongoSession.abortTransaction();
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  } finally {
    mongoSession.endSession();
  }
}
