import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Product } from "@/models";
import {
  attachOffersToProducts,
  deactivateProductLinks,
  saveProductOffers,
} from "@/lib/product-suppliers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const doc = await Product.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [withOffers] = await attachOffersToProducts([doc]);
  return NextResponse.json({ data: withOffers });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const body = await req.json();

  const updated = await Product.findByIdAndUpdate(
    id,
    {
      $set: {
        name: body.name,
        nameBn: body.nameBn,
        sku: body.sku,
        barcode: body.barcode || body.sku,
        brand: body.brand,
        purchasePrice: Number(body.purchasePrice || 0),
        sellPrice: Number(body.sellPrice || 0),
        alertQty: Number(body.alertQty || 10),
        hsCode: body.hsCode,
      },
    },
    { new: true },
  );
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (Array.isArray(body.supplierOffers)) {
    await saveProductOffers(id, body.supplierOffers);
  }

  const lean = updated.toObject();
  const [withOffers] = await attachOffersToProducts([lean]);
  return NextResponse.json({ data: withOffers });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const updated = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await deactivateProductLinks(id);
  return NextResponse.json({ ok: true, soft: true });
}
