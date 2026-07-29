import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact, Product, ProductSupplier } from "@/models";
import {
  attachOffersToProducts,
  healSupplierLabels,
  saveProductOffers,
  syncProductSupplierLinks,
} from "@/lib/product-suppliers";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  await syncProductSupplierLinks();
  await healSupplierLabels();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const locationId = searchParams.get("locationId");
  const lowStock = searchParams.get("lowStock") === "1";
  const categoryId = searchParams.get("categoryId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  const filter: Record<string, unknown> = { isActive: true };
  if (categoryId) filter.categoryId = categoryId;

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    const moneyRaw = q.replace(/[৳,\s]/g, "");
    const isMoney = /^\d+(\.\d+)?$/.test(moneyRaw);
    const amount = isMoney ? Number(moneyRaw) : null;
    const moneyRange =
      amount != null
        ? { $gte: Math.max(0, amount * 0.98), $lte: amount * 1.02 }
        : null;

    const textMatchIds = (
      await Product.find({
        isActive: true,
        $or: [{ name: rx }, { nameBn: rx }, { sku: rx }, { barcode: rx }, { brand: rx }],
      })
        .select("_id")
        .lean()
    ).map((p) => String(p._id));

    const supplierIds = (
      await Contact.find({
        type: { $in: ["supplier", "both"] },
        isActive: true,
        $or: [{ name: rx }, { nameBn: rx }, { mobile: rx }],
      })
        .select("_id")
        .lean()
    ).map((s) => s._id);

    const linkOr: Record<string, unknown>[] = [];
    if (supplierIds.length) linkOr.push({ supplierId: { $in: supplierIds } });
    if (moneyRange) linkOr.push({ price: moneyRange });

    let supplierMatchIds: string[] = [];
    if (linkOr.length) {
      supplierMatchIds = (
        await ProductSupplier.find({ isActive: true, $or: linkOr })
          .select("productId")
          .lean()
      ).map((l) => String(l.productId));
    }

    let priceProductIds: string[] = [];
    if (moneyRange) {
      priceProductIds = (
        await Product.find({
          isActive: true,
          $or: [
            { purchasePrice: moneyRange },
            { sellPrice: moneyRange },
            { "supplierOffers.price": moneyRange },
          ],
        })
          .select("_id")
          .lean()
      ).map((p) => String(p._id));
    }

    const idSet = new Set([...textMatchIds, ...supplierMatchIds, ...priceProductIds]);
    filter._id = {
      $in: [...idSet].map((id) => new Types.ObjectId(id)),
    };
  }

  const total = await Product.countDocuments(filter);
  let products = await Product.find(filter)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  if (locationId) {
    products = products.map((p) => {
      const stock = (p.stocks || []).find(
        (s: { locationId?: unknown; qty?: number }) => String(s.locationId) === locationId,
      );
      return { ...p, locationQty: stock?.qty ?? 0 };
    });
  } else {
    products = products.map((p) => ({
      ...p,
      locationQty: (p.stocks || []).reduce(
        (a: number, s: { qty?: number }) => a + (s.qty || 0),
        0,
      ),
    }));
  }

  if (lowStock) {
    products = products.filter((p) => (p.locationQty as number) <= (p.alertQty || 0));
  }

  products = (await attachOffersToProducts(products)) as typeof products;

  return NextResponse.json({ data: products, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const product = await Product.create({
    name: body.name,
    nameBn: body.nameBn,
    sku: body.sku,
    barcode: body.barcode || body.sku,
    categoryId: body.categoryId || undefined,
    brand: body.brand,
    unit: body.unit || "Pcs",
    unitBn: body.unitBn || "পিস",
    purchasePrice: Number(body.purchasePrice || 0),
    sellPrice: Number(body.sellPrice || 0),
    taxPercent: Number(body.taxPercent || 0),
    alertQty: Number(body.alertQty || 10),
    hsCode: body.hsCode,
    stocks: body.stocks || [],
  });

  if (Array.isArray(body.supplierOffers)) {
    await saveProductOffers(String(product._id), body.supplierOffers);
  }

  const [withOffers] = await attachOffersToProducts([product.toObject()]);
  return NextResponse.json({ data: withOffers }, { status: 201 });
}
