import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact } from "@/models";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

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

  if (!String(body.name || "").trim() || !String(body.mobile || "").trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const contact = await Contact.create({
      type: body.type || "customer",
      name: String(body.name).trim(),
      nameBn: body.nameBn,
      mobile: String(body.mobile).trim(),
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
  } catch (err) {
    console.error("POST /api/contacts", err);
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
}
