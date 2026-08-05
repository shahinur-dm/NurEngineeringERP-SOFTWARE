import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { ServiceJob, Product, Contact } from "@/models";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const job = await ServiceJob.findById(id)
    .populate("customerId", "name mobile address")
    .populate("machineId", "brand model serialNo")
    .populate("technicianId", "name mobile")
    .lean();

  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: job });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const existingJob = await ServiceJob.findById(id).session(mongoSession);
    if (!existingJob) {
      await mongoSession.abortTransaction();
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const previousStatus = existingJob.status;
    const newStatus = body.status || existingJob.status;
    
    // Update fields
    if (body.status) existingJob.status = body.status;
    if (body.technicianId) existingJob.technicianId = body.technicianId;
    if (body.issueDescription) existingJob.issueDescription = body.issueDescription;
    if (body.serviceCharges != null) existingJob.serviceCharges = Number(body.serviceCharges);
    if (body.notes !== undefined) existingJob.notes = body.notes;
    if (body.customerId) existingJob.customerId = body.customerId;
    
    // Handle status transitions (e.g., pending -> completed, deduct stock)
    if (
      previousStatus !== "completed" &&
      previousStatus !== "delivered" &&
      (newStatus === "completed" || newStatus === "delivered")
    ) {
      // Deduct stock for parts used if locationId is provided
      if (body.locationId) {
        for (const it of existingJob.parts) {
          await Product.updateOne(
            { _id: it.productId, "stocks.locationId": body.locationId },
            { $inc: { "stocks.$.qty": -it.qty } },
            { session: mongoSession },
          );
        }
      }
      
      // Update customer balance for any due amount
      if (existingJob.customerId && existingJob.dueAmount > 0) {
        await Contact.updateOne(
          { _id: existingJob.customerId },
          { $inc: { balance: existingJob.dueAmount } },
          { session: mongoSession },
        );
      }
      
      if (newStatus === "delivered") {
        existingJob.deliveredDate = new Date();
      }
    }

    await existingJob.save({ session: mongoSession });
    await mongoSession.commitTransaction();
    return NextResponse.json({ data: existingJob });
  } catch (e) {
    await mongoSession.abortTransaction();
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  } finally {
    mongoSession.endSession();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const deleted = await ServiceJob.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
