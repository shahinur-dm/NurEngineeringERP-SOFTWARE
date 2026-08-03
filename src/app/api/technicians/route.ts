import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Technician } from "@/models";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const data = await Technician.find({ isActive: true }).sort({ name: 1 }).lean();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  try {
    const tech = await Technician.create({
      userId: body.userId || undefined,
      name: body.name,
      mobile: body.mobile,
      speciality: body.speciality,
    });
    return NextResponse.json({ data: tech }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
