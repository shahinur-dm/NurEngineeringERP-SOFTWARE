import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact } from "@/models";
import {
  isGenericSupplierLabel,
  propagateSupplierIdentity,
  deactivateSupplierLinks,
} from "@/lib/product-suppliers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const doc = await Contact.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: doc });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const mobile = String(body.mobile || "").trim();

    if (!name || !mobile) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const openingBalance =
      body.openingBalance != null && body.openingBalance !== ""
        ? Number(body.openingBalance)
        : body.balance != null && body.balance !== ""
          ? Number(body.balance)
          : undefined;

    let nameBn = String(body.nameBn || "").trim();
    if (!nameBn || isGenericSupplierLabel(nameBn)) {
      nameBn = name;
    }

    const $set: Record<string, unknown> = {
      name,
      nameBn,
      mobile,
      email: String(body.email || "").trim(),
      address: String(body.address || "").trim(),
      creditLimit: Number(body.creditLimit || 0),
      isActive: true,
    };

    if (body.nid != null && String(body.nid).trim() !== "") $set.nid = String(body.nid);
    if (body.bin != null && String(body.bin).trim() !== "") $set.bin = String(body.bin);
    if (body.tin != null && String(body.tin).trim() !== "") $set.tin = String(body.tin);
    if (body.type) $set.type = body.type;
    if (openingBalance != null && Number.isFinite(openingBalance)) {
      $set.openingBalance = openingBalance;
      $set.balance = openingBalance;
    }

    const updated = await Contact.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await propagateSupplierIdentity(id);

    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "update_failed";
    console.error("PUT /api/contacts/[id]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await connectDB();
  const updated = await Contact.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await deactivateSupplierLinks(id);
  return NextResponse.json({ ok: true, soft: true, data: updated });
}
