import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { CRM_RESOURCES, isCrmResource } from "@/lib/crm-resources";
import { Lead, CrmClient } from "@/models";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> },
) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { resource } = await ctx.params;
  if (!isCrmResource(resource)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDB();
  const handler = CRM_RESOURCES[resource];
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(500, Number(searchParams.get("limit") || 200));
  const filter: Record<string, unknown> = {};

  if (q && handler.search.length) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const or: Record<string, unknown>[] = handler.search.map((f) => ({ [f]: new RegExp(safe, "i") }));
    if (resource === "followups") {
      const phoneRe = new RegExp(safe, "i");
      const [leads, clients] = await Promise.all([
        Lead.find({ mobile: phoneRe }).select("_id").lean(),
        CrmClient.find({ mobile: phoneRe }).select("_id").lean(),
      ]);
      if (leads.length) or.push({ leadId: { $in: leads.map((row) => row._id) } });
      if (clients.length) {
        const ids = clients.map((row) => String(row._id));
        or.push({ clientId: { $in: ids } });
      }
    }
    filter.$or = or;
  }

  for (const key of ["status", "rating", "source", "product", "company", "stage"]) {
    const value = searchParams.get(key)?.trim();
    if (value && value !== "all") filter[key] = value;
  }

  if (resource === "followups") {
    const view = searchParams.get("view") || "all";
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    if (view === "overdue") {
      filter.scheduledAt = { $lt: todayStart };
      filter.status = { $nin: ["completed"] };
    } else if (view === "today") {
      filter.scheduledAt = { $gte: todayStart, $lte: todayEnd };
    } else if (view === "upcoming") {
      filter.scheduledAt = { $gt: todayEnd, $lte: weekEnd };
      filter.status = { $nin: ["completed"] };
    } else if (view !== "all") {
      filter.status = view.replace("-", "_");
    }
  }

  const data = await handler.model.find(filter).sort("-createdAt").limit(limit).lean();
  const total = await handler.model.countDocuments(filter);
  return NextResponse.json({ data, total });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> },
) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { resource } = await ctx.params;
  if (!isCrmResource(resource)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  for (const field of CRM_RESOURCES[resource].required) {
    if (!body[field]) {
      return NextResponse.json({ error: "validation", field }, { status: 400 });
    }
  }

  await connectDB();
  const created = await CRM_RESOURCES[resource].model.create(body);
  return NextResponse.json({ data: created }, { status: 201 });
}
