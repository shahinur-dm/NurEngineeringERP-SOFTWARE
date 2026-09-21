import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { CrmDeal, CrmClient, Lead } from "@/models";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canWrite(session.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { resource, id } = await ctx.params;
  if (resource !== "deals") return NextResponse.json({ error: "not_found" }, { status: 404 });

  await connectDB();
  try {
  const deal = await CrmDeal.findById(id);
  if (!deal) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (deal.stage !== "won") {
    return NextResponse.json({ error: "deal_not_won" }, { status: 400 });
  }

  const lead = deal.leadId ? await Lead.findById(deal.leadId).lean() : null;
  const phone = deal.phone || lead?.mobile || "";
  const email = deal.email || lead?.email || "";

  const or: Record<string, unknown>[] = [];
  if (phone) or.push({ mobile: phone });
  if (email) or.push({ email });
  if (deal.clientId) or.push({ _id: deal.clientId });

  let client = or.length ? await CrmClient.findOne({ $or: or }) : null;
  let created = false;
  if (!client) {
    client = await CrmClient.create({
      name: deal.clientName || lead?.name || deal.title,
      company: deal.company || lead?.company || "",
      mobile: phone,
      email,
      leadId: deal.leadId && String(deal.leadId).length === 24 ? deal.leadId : undefined,
      campaignId: deal.campaignId || lead?.campaignId,
      campaignName: deal.campaignName || lead?.campaignName,
      dealId: String(deal._id),
      source: lead?.source || deal.campaignName,
      ownerName: deal.ownerName || lead?.ownerName,
      status: "active",
    });
    created = true;
  }

  deal.clientId = String(client._id);
  deal.clientName = client.name;
  await deal.save();

  return NextResponse.json({ data: client, linked: !created, created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "convert_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
