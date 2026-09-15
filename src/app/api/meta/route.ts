import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Location, Business, Account } from "@/models";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await connectDB();

  const type = new URL(req.url).searchParams.get("type");

  if (type === "locations") {
    const locations = await Location.find({ isActive: true }).lean();
    return NextResponse.json({
      data: locations.map((l) => ({
        name: l.name,
        code: l.code,
        address: l.address,
        phone: l.phone,
        _id: l._id,
      })),
    });
  }

  if (type === "business") {
    const business = await Business.findOne().lean();
    if (!business) return NextResponse.json({ data: [] });
    return NextResponse.json({
      data: [
        { label: "Business Name", value: business.name },
        { label: "Phone", value: business.phone },
        { label: "Email", value: business.email },
        { label: "BIN", value: business.bin },
        { label: "Invoice Prefix", value: business.invoicePrefix },
      ],
    });
  }

  if (type === "calendar") {
    const today = new Date();
    return NextResponse.json({
      data: [
        { label: "Today", value: today.toISOString().slice(0, 10) },
        { label: "Month", value: today.toLocaleString("en", { month: "long", year: "numeric" }) },
      ],
    });
  }

  if (type === "profile") {
    const { User } = await import("@/models");
    const user = await User.findById(session.id).lean();
    return NextResponse.json({
      data: [
        { label: "Name", value: session.name },
        { label: "Email", value: session.email },
        { label: "Role", value: session.role },
      ],
      avatarUrl: (user as { avatarUrl?: string } | null)?.avatarUrl || "",
    });
  }

  const [locations, business, accounts] = await Promise.all([
    Location.find({ isActive: true }).lean(),
    Business.findOne().lean(),
    Account.find({ isActive: true }).lean(),
  ]);
  return NextResponse.json({ locations, business, accounts });
}

export async function PUT(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasPermission(session.role, "manage_settings")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const type = body.type || "business";

  try {
    if (type === "business") {
      const $set: Record<string, unknown> = {};
      for (const key of [
        "name",
        "nameBn",
        "address",
        "addressBn",
        "phone",
        "email",
        "website",
        "bin",
        "tin",
        "mushak",
        "currency",
        "invoicePrefix",
        "purchasePrefix",
        "defaultLocale",
        "stockMethod",
        "logoUrl",
        "faviconUrl",
      ]) {
        if (body[key] != null) $set[key] = body[key];
      }
      const business =
        (await Business.findOneAndUpdate({}, { $set }, { new: true })) ||
        (await Business.create($set));
      return NextResponse.json({ data: business });
    }

    if (type === "profile") {
      if (!isSuperAdmin(session.role)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const avatarUrl = String(body.avatarUrl || "");
      if (avatarUrl && !avatarUrl.startsWith("data:image/") && !avatarUrl.startsWith("http")) {
        return NextResponse.json({ error: "invalid_image" }, { status: 400 });
      }
      if (avatarUrl.startsWith("data:image/") && avatarUrl.length > 1_200_000) {
        return NextResponse.json({ error: "too_large" }, { status: 400 });
      }
      const { User } = await import("@/models");
      const updated = await User.findByIdAndUpdate(
        session.id,
        { $set: { avatarUrl } },
        { new: true },
      );
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ data: { avatarUrl: updated.avatarUrl || "" } });
    }
    if (type === "location") {
      if (body._id) {
        const updated = await Location.findByIdAndUpdate(
          body._id,
          {
            $set: {
              name: body.name,
              code: body.code,
              address: body.address,
              phone: body.phone,
              isActive: body.isActive !== false,
            },
          },
          { new: true },
        );
        if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
        return NextResponse.json({ data: updated });
      }
      const created = await Location.create({
        name: body.name,
        code: body.code,
        address: body.address,
        phone: body.phone,
        isActive: true,
      });
      return NextResponse.json({ data: created }, { status: 201 });
    }

    return NextResponse.json({ error: "unknown_type" }, { status: 400 });
  } catch (err) {
    console.error("PUT /api/meta", err);
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasPermission(session.role, "manage_settings")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await connectDB();
  const id = new URL(req.url).searchParams.get("locationId");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const updated = await Location.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, soft: true });
}
