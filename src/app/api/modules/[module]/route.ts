import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession, hashPassword } from "@/lib/auth";
import { MODULE_MODEL_MAP } from "@/lib/module-models";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ module: string }> },
) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { module } = await ctx.params;
  const handler = MODULE_MODEL_MAP[module];
  if (!handler) return NextResponse.json({ data: [], total: 0 });

  await connectDB();
  const { searchParams } = new URL(_req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(200, Number(searchParams.get("limit") || 50));

  const filter: Record<string, unknown> = { ...(handler.filter ?? {}) };
  if (handler.softDelete) filter.isActive = true;
  if (q && handler.search) {
    filter.$or = handler.search.map((f) => ({ [f]: new RegExp(q, "i") }));
  }

  const data = await handler.model
    .find(filter)
    .sort(handler.sort || "-createdAt")
    .limit(limit)
    .lean();

  return NextResponse.json({ data, total: data.length });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ module: string }> },
) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { module } = await ctx.params;
  const handler = MODULE_MODEL_MAP[module];
  if (!handler) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDB();
  const body = await req.json();

  if (module === "users" && body.password) {
    body.passwordHash = await hashPassword(String(body.password));
    delete body.password;
  }

  if (module === "accounts" && body.openingBalance != null && body.balance == null) {
    body.balance = Number(body.openingBalance);
  }

  if (module === "expense-categories") {
    body.kind = "expense";
  }
  if (module === "categories") {
    body.kind = body.kind ?? "product";
  }

  const created = await handler.model.create(body);
  return NextResponse.json({ data: created }, { status: 201 });
}
