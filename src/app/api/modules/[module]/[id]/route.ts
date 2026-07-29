import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { MODULE_MODEL_MAP } from "@/lib/module-models";

type Ctx = { params: Promise<{ module: string; id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { module, id } = await ctx.params;
  const handler = MODULE_MODEL_MAP[module];
  if (!handler) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDB();
  const doc = await handler.model.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: doc });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { module, id } = await ctx.params;
  const handler = MODULE_MODEL_MAP[module];
  if (!handler) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDB();
  const body = await req.json();
  delete body._id;
  delete body.__v;
  delete body.createdAt;
  delete body.updatedAt;

  if (module === "users" && body.password) {
    const { hashPassword } = await import("@/lib/auth");
    body.passwordHash = await hashPassword(String(body.password));
    delete body.password;
  }

  const updated = await handler.model.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { module, id } = await ctx.params;
  const handler = MODULE_MODEL_MAP[module];
  if (!handler) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDB();
  if (handler.softDelete) {
    const updated = await handler.model.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ data: updated, soft: true });
  }

  const deleted = await handler.model.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
