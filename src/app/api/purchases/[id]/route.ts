import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Purchase } from "@/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const body = await req.json();
  const set: Record<string, unknown> = {};
  const textFields = [
    "referenceNo",
    "supplierName",
    "supplierWhatsapp",
    "supplierWechat",
    "note",
    "purchaseType",
    "currency",
    "documentName",
    "documentUrl",
    "status",
  ];
  const numberFields = ["discount", "tax", "shippingCost", "otherCost"];
  for (const key of textFields) {
    if (body[key] !== undefined) set[key] = body[key];
  }
  for (const key of numberFields) {
    if (body[key] !== undefined) set[key] = Number(body[key] || 0);
  }
  if (body.purchaseDate !== undefined) set.purchaseDate = new Date(body.purchaseDate);
  if (body.receivingDate !== undefined) set.receivingDate = new Date(body.receivingDate);
  const updated = await Purchase.findByIdAndUpdate(
    id,
    { $set: set },
    { new: true },
  );
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const deleted = await Purchase.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
