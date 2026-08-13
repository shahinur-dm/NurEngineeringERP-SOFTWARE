import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Sale, Business, Location, Shipment } from "@/models";
import { paymentStatusFromAmounts } from "@/lib/sale-finance";
import { nextQuotationNo, nextReferenceNo } from "@/lib/doc-numbers";

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
  const updated = await Sale.findByIdAndUpdate(
    id,
    {
      customerName: body.customerName,
      note: body.note,
      staffNote: body.staffNote,
      status: body.status,
    },
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
