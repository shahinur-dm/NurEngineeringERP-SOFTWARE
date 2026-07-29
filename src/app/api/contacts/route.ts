import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact } from "@/models";
import { CATALOG_SUPPLIERS } from "@/lib/seed-data";

/** Ensure catalog supplier slots exist by mobile (never recreate after rename) */
async function ensureCatalogSuppliers() {
  for (const s of CATALOG_SUPPLIERS) {
    const exists = await Contact.findOne({ mobile: s.mobile });
    if (!exists) {
      await Contact.create({
        type: "supplier",
        name: s.name,
        nameBn: s.nameBn,
        mobile: s.mobile,
        address: s.address,
        city: s.city,
        balance: 0,
        openingBalance: 0,
        isActive: true,
      });
    }
  }
}

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  if (type === "supplier") {
    await ensureCatalogSuppliers();
  }

  const filter: Record<string, unknown> = { isActive: true };
  if (type === "customer") filter.type = { $in: ["customer", "both"] };
  if (type === "supplier") filter.type = { $in: ["supplier", "both"] };
  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { nameBn: new RegExp(q, "i") },
      { mobile: new RegExp(q, "i") },
    ];
  }

  const [data, total] = await Promise.all([
    Contact.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Contact.countDocuments(filter),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const contact = await Contact.create({
    type: body.type || "customer",
    name: body.name,
    nameBn: body.nameBn,
    mobile: body.mobile,
    email: body.email,
    address: body.address,
    nid: body.nid,
    bin: body.bin,
    tin: body.tin,
    creditLimit: Number(body.creditLimit || 0),
    balance: Number(body.openingBalance || 0),
    openingBalance: Number(body.openingBalance || 0),
  });

  return NextResponse.json({ data: contact }, { status: 201 });
}
