import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact, Location, Product, ProductSupplier, nextSeq } from "@/models";
import { attachOffersToProducts, saveProductOffers } from "@/lib/product-suppliers";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseApiError(err: unknown) {
  if (err && typeof err === "object" && "code" in err && err.code === 11000) {
    return { status: 409, error: "duplicate_sku" as const };
  }
  const message = err instanceof Error ? err.message : "failed";
  return { status: 500, error: message };
}

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();

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

    const or: Record<string, unknown>[] = [
      { name: rx },
      { nameBn: rx },
      { sku: rx },
      { barcode: rx },
      { brand: rx },
    ];

    const extraQueries: Promise<string[]>[] = [];

    extraQueries.push(
      Contact.find({
        type: { $in: ["supplier", "both"] },
        isActive: true,
        $or: [{ name: rx }, { nameBn: rx }, { mobile: rx }],
      })
        .select("_id")
        .lean()
        .then(async (suppliers) => {
          if (!suppliers.length) return [];
          const ids = suppliers.map((s) => s._id);
          return ProductSupplier.find({
            isActive: true,
            supplierId: { $in: ids },
          })
            .distinct("productId")
            .then((ids) => ids.map(String));
        }),
    );

    if (moneyRange) {
      extraQueries.push(
        Product.find({
          isActive: true,
          $or: [{ purchasePrice: moneyRange }, { sellPrice: moneyRange }],
        })
          .distinct("_id")
          .then((ids) => ids.map(String)),
      );
      extraQueries.push(
        ProductSupplier.find({ isActive: true, price: moneyRange })
          .distinct("productId")
          .then((ids) => ids.map(String)),
      );
    }

    const extraIdSets = await Promise.all(extraQueries);
    const extraIds = [...new Set(extraIdSets.flat())];
    if (extraIds.length) {
      or.push({ _id: { $in: extraIds.map((id) => new Types.ObjectId(id)) } });
    }

    filter.$or = or;
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

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "missing_name" }, { status: 400 });
    }

    let sku = String(body.sku || "").trim();
    if (!sku) {
      const seq = await nextSeq("product_sku");
      sku = `SKU-${String(seq).padStart(5, "0")}`;
    }

    const duplicate = await Product.findOne({ sku }).lean();
    if (duplicate) {
      return NextResponse.json({ error: "duplicate_sku", sku }, { status: 409 });
    }

    let stocks = body.stocks;
    if (!Array.isArray(stocks) || !stocks.length) {
      const location = await Location.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
      if (location) {
        stocks = [
          {
            locationId: location._id,
            qty: Number(body.openingQty || 0),
          },
        ];
      } else {
        stocks = [];
      }
    }

    const product = await Product.create({
      name,
      nameBn: body.nameBn,
      sku,
      barcode: body.barcode || sku,
      categoryId: body.categoryId || undefined,
      brand: body.brand,
      unit: body.unit || "Pcs",
      unitBn: body.unitBn || "পিস",
      purchasePrice: Number(body.purchasePrice || 0),
      sellPrice: Number(body.sellPrice || 0),
      currency: ["BDT", "USD", "RMB"].includes(String(body.currency || ""))
        ? String(body.currency)
        : "BDT",
      taxPercent: Number(body.taxPercent || 0),
      alertQty: Number(body.alertQty || 10),
      hsCode: body.hsCode,
      imageUrl: body.imageUrl || undefined,
      description: body.description != null ? String(body.description) : undefined,
      warrantyMonths: Number(body.warrantyMonths || 0),
      serialNo: body.serialNo != null ? String(body.serialNo).trim() : undefined,
      incomeAccountId: body.incomeAccountId || undefined,
      expenseAccountId: body.expenseAccountId || undefined,
      stockMethod:
        body.stockMethod === "fifo" || body.stockMethod === "lifo" || body.stockMethod === "avg"
          ? body.stockMethod
          : undefined,
      stocks,
    });

    if (Array.isArray(body.supplierOffers)) {
      await saveProductOffers(String(product._id), body.supplierOffers);
    }

    const [withOffers] = await attachOffersToProducts([product.toObject()]);
    return NextResponse.json({ data: withOffers }, { status: 201 });
  } catch (err) {
    const parsed = parseApiError(err);
    console.error("POST /api/products", err);
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
}
