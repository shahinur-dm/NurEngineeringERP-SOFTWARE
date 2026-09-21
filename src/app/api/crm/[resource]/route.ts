import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { CRM_RESOURCES, isCrmResource } from "@/lib/crm-resources";
import { publicClient, prepareClientBody } from "@/lib/crm-client";
import { Lead, CrmClient, CrmCampaign, CrmDeal, CrmFollowUp } from "@/models";

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

  for (const key of ["status", "rating", "source", "product", "company", "stage", "ownerName", "campaignId"]) {
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

  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  if (from || to) {
    const dateField = resource === "followups" ? "scheduledAt" : "createdAt";
    const range: Record<string, Date> = {};
    if (from) range.$gte = startOfDay(new Date(from));
    if (to) range.$lte = endOfDay(new Date(to));
    const existing = filter[dateField];
    if (existing) {
      const and = Array.isArray(filter.$and) ? filter.$and : [];
      and.push({ [dateField]: existing }, { [dateField]: range });
      filter.$and = and;
      delete filter[dateField];
    } else {
      filter[dateField] = range;
    }
  }

  const data = await handler.model.find(filter).sort("-createdAt").limit(limit).lean();
  const total = await handler.model.countDocuments(filter);

  if (resource === "campaigns") {
    const allCampaigns = await CrmCampaign.find({}).select("_id status").lean();
    const allLeads = await Lead.find({ campaignId: { $exists: true, $ne: "" } })
      .select("campaignId status")
      .lean();
    const allDeals = await CrmDeal.find({ campaignId: { $exists: true, $ne: "" } })
      .select("campaignId stage value")
      .lean();
    const allFollows = await CrmFollowUp.find({ campaignId: { $exists: true, $ne: "" } })
      .select("campaignId")
      .lean();

    const statsFor = (cid: string) => {
      const leads = allLeads.filter((l) => String(l.campaignId) === cid);
      const deals = allDeals.filter((d) => String(d.campaignId) === cid);
      const follows = allFollows.filter((f) => String(f.campaignId) === cid);
      const qualified = leads.filter((l) => l.status === "qualified").length;
      const wonDeals = deals.filter((d) => d.stage === "won");
      const pipeline = deals.reduce((s, d) => s + Number(d.value || 0), 0);
      const wonValue = wonDeals.reduce((s, d) => s + Number(d.value || 0), 0);
      return {
        leads: leads.length,
        qualified,
        followups: follows.length,
        deals: deals.length,
        wonDeals: wonDeals.length,
        pipelineValue: pipeline,
        wonValue,
        conversion: leads.length ? Math.round((wonDeals.length / leads.length) * 1000) / 10 : 0,
      };
    };

    const enriched = (data as { _id: unknown }[]).map((row) => ({
      ...row,
      stats: statsFor(String(row._id)),
    }));

    const wonAll = allDeals.filter((d) => d.stage === "won");
    const kpis = {
      total: allCampaigns.length,
      active: allCampaigns.filter((c) => c.status === "active").length,
      leads: allLeads.length,
      qualified: allLeads.filter((l) => l.status === "qualified").length,
      followups: allFollows.length,
      deals: allDeals.length,
      wonDeals: wonAll.length,
      campaignValue: allDeals.reduce((s, d) => s + Number(d.value || 0), 0),
      conversion: allLeads.length ? Math.round((wonAll.length / allLeads.length) * 1000) / 10 : 0,
    };

    return NextResponse.json({ data: enriched, total, kpis });
  }

  if (resource === "clients") {
    return NextResponse.json({ data: (data as unknown[]).map(publicClient), total });
  }

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

  if (resource === "clients") {
    const prepared = await prepareClientBody(body, { isUpdate: false });
    if ("error" in prepared) {
      return NextResponse.json({ error: prepared.error, field: prepared.field }, { status: 400 });
    }
    const created = await CRM_RESOURCES.clients.model.create(prepared.body);
    return NextResponse.json({ data: publicClient(created) }, { status: 201 });
  }

  if (resource === "campaigns") {
    if (body.startsAt && body.endsAt && new Date(body.endsAt) < new Date(body.startsAt)) {
      return NextResponse.json({ error: "validation", field: "endsAt" }, { status: 400 });
    }
    const dup = await CrmCampaign.findOne({ name: String(body.name).trim() }).lean();
    if (dup) return NextResponse.json({ error: "duplicate", field: "name" }, { status: 409 });
  }

  if (resource === "leads" && body.campaignId) {
    const campaign = await CrmCampaign.findById(body.campaignId).lean();
    if (campaign) {
      body.campaignName = campaign.name;
      if (!body.source) body.source = campaign.source;
    }
  }

  if (resource === "followups" && body.leadId) {
    const lead = await Lead.findById(body.leadId).lean();
    if (lead) {
      body.leadName = body.leadName || lead.name;
      body.phone = body.phone || lead.mobile;
      body.company = body.company || lead.company;
      body.campaignId = body.campaignId || lead.campaignId;
      body.campaignName = body.campaignName || lead.campaignName;
      body.ownerName = body.ownerName || lead.ownerName;
    }
  }

  if (resource === "deals" && body.leadId) {
    const lead = await Lead.findById(body.leadId).lean();
    if (lead) {
      body.leadName = body.leadName || lead.name;
      body.company = body.company || lead.company;
      body.phone = body.phone || lead.mobile;
      body.email = body.email || lead.email;
      body.campaignId = body.campaignId || lead.campaignId;
      body.campaignName = body.campaignName || lead.campaignName;
      body.ownerName = body.ownerName || lead.ownerName;
      body.clientName = body.clientName || lead.name;
    }
  }

  const created = await CRM_RESOURCES[resource].model.create(body);
  return NextResponse.json({ data: created }, { status: 201 });
}
