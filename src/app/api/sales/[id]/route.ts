import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Sale, Business, Location, Shipment } from "@/models";
import { calcDueAmount, paymentStatusFromAmounts, roundMoney } from "@/lib/sale-finance";
import { nextQuotationNo, nextReferenceNo } from "@/lib/doc-numbers";
import { resolveDocumentSubject } from "@/lib/document-subject";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectDB();

  const sale = await Sale.findById(id);
  if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (sale.status === "quotation") {
    let changed = false;
    if (!sale.quotationNo) {
      sale.quotationNo = await nextQuotationNo();
      changed = true;
    }
    if (!sale.referenceNo) {
      sale.referenceNo = await nextReferenceNo();
      changed = true;
    }
    if (changed) await sale.save();
  }

  const [business, location, shipment] = await Promise.all([
    Business.findOne().lean(),
    sale.locationId ? Location.findById(sale.locationId).lean() : null,
    Shipment.findOne({ saleId: id }).lean(),
  ]);

  return NextResponse.json({
    data: sale.toObject ? sale.toObject() : sale,
    business,
    location,
    shipment,
    paymentStatus: paymentStatusFromAmounts(sale.grandTotal || 0, sale.paidAmount || 0),
  });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const body = await req.json();
  const existing = await Sale.findById(id).lean();
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const $set: Record<string, unknown> = {};
  for (const key of ["customerName", "note", "staffNote", "status"]) {
    if (body[key] !== undefined) $set[key] = body[key];
  }
  if (existing.status === "quotation") {
    for (const key of [
      "quotationNo",
      "referenceNo",
      "customerMobile",
      "customerAddress",
      "customerEmail",
      "pfNo",
      "poNo",
      "challanNo",
      "binNo",
      "subject",
      "attention",
      "documentBody",
      "terms",
    ]) {
      if (body[key] !== undefined) $set[key] = body[key];
    }
    if ($set.subject != null) {
      $set.subject = resolveDocumentSubject({
        stored: String($set.subject),
        terms: body.terms,
        note: body.note,
        items: body.items || [],
      });
    }
    for (const key of [
      "subtotal",
      "discount",
      "tax",
      "shipping",
      "grandTotal",
      "paidAmount",
      "dueAmount",
    ]) {
      if (body[key] !== undefined) $set[key] = Number(body[key] || 0);
    }
    if (body.saleDate !== undefined) $set.saleDate = new Date(body.saleDate);
    if (body.customerId !== undefined) $set.customerId = body.customerId || undefined;
    if (Array.isArray(body.items)) {
      const items = body.items.map(
        (it: {
          productId?: string;
          name?: string;
          sku?: string;
          unit?: string;
          description?: string;
          imageUrl?: string;
          qty?: number;
          bonusQty?: number;
          unitPrice?: number;
          discount?: number;
          taxPercent?: number;
        }) => {
          const qty = Number(it.qty || 0);
          const unitPrice = Number(it.unitPrice || 0);
          const discount = Number(it.discount || 0);
          const taxPercent = Number(it.taxPercent || 0);
          const base = qty * unitPrice - discount;
          const lineTotal = roundMoney(base + (base * taxPercent) / 100);
          return {
            productId: it.productId && /^[a-f0-9]{24}$/i.test(String(it.productId)) ? it.productId : undefined,
            name: String(it.name || "").trim() || it.sku || "Item",
            sku: it.sku,
            unit: it.unit || "Pcs",
            description: it.description != null ? String(it.description) : "",
            imageUrl: it.imageUrl ? String(it.imageUrl) : "",
            qty,
            bonusQty: Number(it.bonusQty || 0),
            unitPrice: roundMoney(unitPrice),
            discount: roundMoney(discount),
            taxPercent,
            lineTotal,
          };
        },
      );
      $set.items = items;
      const subtotal = roundMoney(items.reduce((a: number, i: { qty: number; unitPrice: number }) => a + i.qty * i.unitPrice, 0));
      const tax = body.tax !== undefined ? Number(body.tax || 0) : Number(existing.tax || 0);
      const shipping =
        body.shipping !== undefined ? Number(body.shipping || 0) : Number(existing.shipping || 0);
      const discount =
        body.discount !== undefined ? Number(body.discount || 0) : Number(existing.discount || 0);
      const paidAmount =
        body.paidAmount !== undefined ? Number(body.paidAmount || 0) : Number(existing.paidAmount || 0);
      $set.subtotal = subtotal;
      $set.discount = roundMoney(discount);
      $set.tax = roundMoney(tax);
      $set.shipping = roundMoney(shipping);
      $set.grandTotal = roundMoney(Math.max(0, subtotal - discount + tax + shipping));
      $set.paidAmount = roundMoney(paidAmount);
      $set.dueAmount = calcDueAmount(Number($set.grandTotal), Number($set.paidAmount));
    }
  }

  const updated = await Sale.findByIdAndUpdate(
    id,
    { $set },
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
  const deleted = await Sale.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
