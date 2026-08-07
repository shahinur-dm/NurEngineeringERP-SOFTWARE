import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Product } from "@/models";
import {
  attachOffersToProducts,
  deactivateProductLinks,
  saveProductOffers,
} from "@/lib/product-suppliers";
import { canDelete, canWrite } from "@/lib/rbac";

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
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await connectDB();
  const body = await req.json();

  try {
    const $set: Record<string, unknown> = {};
    if (body.name != null) $set.name = body.name;
    if (body.nameBn != null) $set.nameBn = body.nameBn;
    if (body.sku != null) {
      $set.sku = body.sku;
      $set.barcode = body.barcode || body.sku;
    } else if (body.barcode != null) {
      $set.barcode = body.barcode;
    }
    if (body.brand != null) $set.brand = body.brand;
    if (body.purchasePrice != null && body.purchasePrice !== "") {
      $set.purchasePrice = Number(body.purchasePrice);
    }
    if (body.sellPrice != null && body.sellPrice !== "") {
      $set.sellPrice = Number(body.sellPrice);
    }
    if (body.currency != null && body.currency !== "") {
      const c = String(body.currency);
      if (["BDT", "USD", "RMB"].includes(c)) $set.currency = c;
    }
    if (body.alertQty != null && body.alertQty !== "") {
      $set.alertQty = Number(body.alertQty);
    }
    if (body.hsCode != null) $set.hsCode = body.hsCode;
    if (body.description != null) $set.description = String(body.description);
    if (body.warrantyMonths != null && body.warrantyMonths !== "") {
      $set.warrantyMonths = Number(body.warrantyMonths);
    }
    if (body.serialNo != null) $set.serialNo = String(body.serialNo).trim();
    if (body.imageUrl != null) $set.imageUrl = body.imageUrl || undefined;
    if (body.incomeAccountId !== undefined) {
      $set.incomeAccountId = body.incomeAccountId || undefined;
    }
    if (body.expenseAccountId !== undefined) {
      $set.expenseAccountId = body.expenseAccountId || undefined;
    }
    if (body.stockMethod === "fifo" || body.stockMethod === "lifo" || body.stockMethod === "avg") {
      $set.stockMethod = body.stockMethod;
    } else if (body.stockMethod === "" || body.stockMethod === null) {
      $set.stockMethod = undefined;
    }
    if (Array.isArray(body.stocks)) $set.stocks = body.stocks;

    let updated =
      Object.keys($set).length > 0
        ? await Product.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true })
        : await Product.findById(id);

    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (body.stockUpdate?.locationId != null) {
      const locId = body.stockUpdate.locationId;
      const qty = Number(body.stockUpdate.qty || 0);
      const stocks = [...(updated.stocks || [])];
      const idx = stocks.findIndex((s) => String(s.locationId) === String(locId));
      if (idx >= 0) {
        stocks[idx]!.qty = qty;
      } else {
        stocks.push({ locationId: locId, qty });
      }
      updated.stocks = stocks;
      await updated.save();
    }

    if (Array.isArray(body.supplierOffers)) {
      await saveProductOffers(id, body.supplierOffers);
      updated = await Product.findById(id);
    }

    const lean = updated!.toObject();
    const [withOffers] = await attachOffersToProducts([lean]);
    return NextResponse.json({ data: withOffers });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return NextResponse.json({ error: "duplicate_sku" }, { status: 409 });
    }
    console.error("PUT /api/products/[id]", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canDelete(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await connectDB();
  const updated = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await deactivateProductLinks(id);
  return NextResponse.json({ ok: true, soft: true });
}
