import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Lead, CrmFollowUp, CrmDeal, CrmCampaign, CrmClient } from "@/models";

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

function fillDaily(from: Date, to: Date, rows: { _id: string; count: number }[]) {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const out: { date: string; count: number }[] = [];
  const cur = startOfDay(from);
  const last = startOfDay(to);
  while (cur <= last) {
    const key = cur.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await connectDB();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(new Date(todayStart.getTime() - 24 * 60 * 60 * 1000));
  const yesterdayEnd = new Date(todayStart.getTime() - 1);
  const weekEnd = endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
  const thirtyStart = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [
    leadTotal,
    leadOpen,
    leadWon,
    leadLost,
    hot,
    warm,
    cold,
    leadsToday,
    leadsYesterday,
    followTotal,
    followOverdue,
    followToday,
    followUpcoming,
    followScheduled,
    followCompleted,
    followTodayCompleted,
    followYesterdayCompleted,
    dealTotal,
    dealValue,
    dealsWon,
    dealsLost,
    dealWonValue,
    campaignTotal,
    clientTotal,
    recentLeads,
    overdueFollows,
    recentDeals,
    dealsByStage,
    leadDays,
    followDays,
    companiesLead,
    companiesClient,
    followLeadIds,
    leadQualified,
    campaignLeads,
    activeDeals,
    bySource,
    byStatus,
    recentFollowups,
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ status: "open" }),
    Lead.countDocuments({ status: "won" }),
    Lead.countDocuments({ status: "lost" }),
    Lead.countDocuments({ rating: "hot" }),
    Lead.countDocuments({ rating: "warm" }),
    Lead.countDocuments({ rating: "cold" }),
    Lead.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Lead.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
    CrmFollowUp.countDocuments(),
    CrmFollowUp.countDocuments({
      scheduledAt: { $lt: todayStart },
      status: { $nin: ["completed"] },
    }),
    CrmFollowUp.countDocuments({ scheduledAt: { $gte: todayStart, $lte: todayEnd } }),
    CrmFollowUp.countDocuments({
      scheduledAt: { $gt: todayEnd, $lte: weekEnd },
      status: { $nin: ["completed"] },
    }),
    CrmFollowUp.countDocuments({ status: "scheduled" }),
    CrmFollowUp.countDocuments({ status: "completed" }),
    CrmFollowUp.countDocuments({
      status: "completed",
      updatedAt: { $gte: todayStart, $lte: todayEnd },
    }),
    CrmFollowUp.countDocuments({
      status: "completed",
      updatedAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
    }),
    CrmDeal.countDocuments(),
    CrmDeal.aggregate([{ $group: { _id: null, total: { $sum: "$value" } } }]),
    CrmDeal.countDocuments({ stage: "won" }),
    CrmDeal.countDocuments({ stage: "lost" }),
    CrmDeal.aggregate([{ $match: { stage: "won" } }, { $group: { _id: null, total: { $sum: "$value" } } }]),
    CrmCampaign.countDocuments(),
    CrmClient.countDocuments(),
    Lead.find().sort("-createdAt").limit(8).lean(),
    CrmFollowUp.find({
      scheduledAt: { $lt: todayStart },
      status: { $nin: ["completed"] },
    })
      .sort("scheduledAt")
      .limit(8)
      .lean(),
    CrmDeal.find().sort("-updatedAt").limit(8).lean(),
    CrmDeal.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$value" } } }]),
    Lead.aggregate([
      { $match: { createdAt: { $gte: thirtyStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CrmFollowUp.aggregate([
      { $match: { createdAt: { $gte: thirtyStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Lead.distinct("company", { company: { $nin: [null, ""] } }),
    CrmClient.distinct("company", { company: { $nin: [null, ""] } }),
    CrmFollowUp.distinct("leadId", { leadId: { $ne: null } }),
    Lead.countDocuments({ status: "qualified" }),
    Lead.countDocuments({ campaignId: { $exists: true, $nin: [null, ""] } }),
    CrmDeal.countDocuments({ stage: { $nin: ["won", "lost"] } }),
    Lead.aggregate([{ $group: { _id: { $ifNull: ["$source", "Unknown"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    Lead.aggregate([{ $group: { _id: { $ifNull: ["$status", "open"] }, count: { $sum: 1 } } }]),
    CrmFollowUp.find().sort("-scheduledAt").limit(8).lean(),
  ]);

  const followed = new Set((followLeadIds || []).map((id) => String(id)));
  const allLeadIds = await Lead.find({}, { _id: 1 }).lean();
  const zeroFollowups = allLeadIds.filter((row) => !followed.has(String(row._id))).length;
  const companies = new Set(
    [...(companiesLead || []), ...(companiesClient || [])].map((c) => String(c).trim()).filter(Boolean),
  );

  return NextResponse.json({
    data: {
      leads: {
        total: leadTotal,
        open: leadOpen,
        won: leadWon,
        lost: leadLost,
        hot,
        warm,
        cold,
        today: leadsToday,
        yesterday: leadsYesterday,
        withoutFollowup: zeroFollowups,
        companies: companies.size,
        qualified: leadQualified,
        fromCampaigns: campaignLeads,
        conversion: leadTotal ? Math.round((dealsWon / leadTotal) * 1000) / 10 : 0,
        bySource,
        byStatus,
      },
      followups: {
        total: followTotal,
        overdue: followOverdue,
        today: followToday,
        upcoming: followUpcoming,
        scheduled: followScheduled,
        completed: followCompleted,
        todayCompleted: followTodayCompleted,
        yesterdayCompleted: followYesterdayCompleted,
      },
      deals: {
        total: dealTotal,
        value: dealValue[0]?.total || 0,
        won: dealsWon,
        lost: dealsLost,
        wonValue: dealWonValue[0]?.total || 0,
        byStage: dealsByStage,
        active: activeDeals,
      },
      campaigns: { total: campaignTotal },
      clients: { total: clientTotal },
      recentLeads,
      overdueFollows,
      recentDeals,
      recentFollowups,
      charts: {
        leads30: fillDaily(thirtyStart, todayStart, leadDays as { _id: string; count: number }[]),
        followups30: fillDaily(thirtyStart, todayStart, followDays as { _id: string; count: number }[]),
      },
    },
  });
}
