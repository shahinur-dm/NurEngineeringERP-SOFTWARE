import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Contact } from "@/models";

function withSupplierAliases<T extends Record<string, unknown>>(doc: T) {
  const type = String(doc.type || "");
  if (type !== "supplier" && type !== "both") return doc;
  return {
    ...doc,
    supplierName: String(doc.supplierName || doc.name || ""),
    supplierContact: String(doc.supplierContact || doc.mobile || ""),
    supplierEmail: String(doc.supplierEmail || doc.email || ""),
    location: String(doc.location || ""),
    supplierWhatsApp: String(doc.supplierWhatsApp || ""),
    supplierWeChat: String(doc.supplierWeChat || ""),
    supplierCurrencyName: String(doc.supplierCurrencyName || ""),
  };
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

  const filter: Record<string, unknown> = { isActive: true };
  if (type === "customer") filter.type = { $in: ["customer", "both"] };
  if (type === "supplier") filter.type = { $in: ["supplier", "both"] };
  if (type === "employee") filter.type = "employee";
  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { nameBn: new RegExp(q, "i") },
      { mobile: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { supplierName: new RegExp(q, "i") },
      { supplierContact: new RegExp(q, "i") },
      { location: new RegExp(q, "i") },
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

  return NextResponse.json({
    data: data.map((row) => withSupplierAliases(row as Record<string, unknown>)),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const name = String(body.supplierName || body.name || "").trim();
  const mobile = String(body.supplierContact || body.mobile || "").trim();
  const email = String(body.supplierEmail || body.email || "").trim();

  if (!name || !mobile) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const contact = await Contact.create({
      type: body.type || "customer",
      name,
      nameBn: body.nameBn,
      mobile,
      phone: body.phone,
      email,
      address: body.address,
      nid: body.nid,
      bin: body.bin,
      tin: body.tin,
      creditLimit: Number(body.creditLimit || 0),
      balance: Number(body.openingBalance || 0),
      openingBalance: Number(body.openingBalance || 0),
      basicSalary: Number(body.basicSalary || 0),
      location: body.location,
      supplierName: name,
      supplierContact: mobile,
      supplierEmail: email,
      supplierWhatsApp: body.supplierWhatsApp,
      supplierWeChat: body.supplierWeChat,
      supplierCurrencyName: body.supplierCurrencyName,
    });

    return NextResponse.json({ data: withSupplierAliases(contact.toObject()) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contacts", err);
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
}
