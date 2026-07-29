import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Location, Business, Account } from "@/models";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await connectDB();

  const type = new URL(req.url).searchParams.get("type");

  if (type === "locations") {
    const locations = await Location.find({ isActive: true }).lean();
    return NextResponse.json({
      data: locations.map((l) => ({ name: l.name, code: l.code, _id: l._id })),
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
    return NextResponse.json({
      data: [
        { label: "Name", value: session.name },
        { label: "Email", value: session.email },
        { label: "Role", value: session.role },
      ],
    });
  }

  const [locations, business, accounts] = await Promise.all([
    Location.find({ isActive: true }).lean(),
    Business.findOne().lean(),
    Account.find({ isActive: true }).lean(),
  ]);
  return NextResponse.json({ locations, business, accounts });
}
