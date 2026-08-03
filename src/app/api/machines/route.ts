import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Machine } from "@/models";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const q = searchParams.get("q")?.trim();

  const filter: Record<string, unknown> = {};
  if (customerId) filter.customerId = customerId;
  if (q) {
    filter.$or = [
      { brand: new RegExp(q, "i") },
      { model: new RegExp(q, "i") },
      { serialNo: new RegExp(q, "i") },
    ];
  }

  const data = await Machine.find(filter).populate("customerId", "name mobile").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  try {
    const machine = await Machine.create({
      customerId: body.customerId,
      brand: body.brand,
      model: body.model,
      serialNo: body.serialNo || undefined,
      machineType: body.machineType,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : undefined,
      notes: body.notes,
    });
    return NextResponse.json({ data: machine }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
