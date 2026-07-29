import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Sale, Business, Location } from "@/models";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await connectDB();

  const sale = await Sale.findById(id).lean();
  if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [business, location] = await Promise.all([
    Business.findOne().lean(),
    sale.locationId ? Location.findById(sale.locationId).lean() : null,
  ]);

  return NextResponse.json({
    data: sale,
    business,
    location,
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
