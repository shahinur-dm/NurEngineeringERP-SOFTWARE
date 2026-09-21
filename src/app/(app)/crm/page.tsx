"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CircleDot,
  Flame,
  Handshake,
  Megaphone,
  Snowflake,
  Sun,
  Target,
  Users,
  UserPlus,
} from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn, formatBDT, formatDateBD } from "@/lib/utils";

type Summary = {
  leads: {
    total: number;
    open: number;
    won: number;
    lost: number;
    hot: number;
    warm: number;
    cold: number;
    today: number;
    yesterday: number;
    withoutFollowup: number;
    companies: number;
    qualified?: number;
    fromCampaigns?: number;
    conversion?: number;
    bySource?: { _id: string; count: number }[];
    byStatus?: { _id: string; count: number }[];
  };
  followups: {
    total: number;
    overdue: number;
    today: number;
    upcoming: number;
    scheduled: number;
    completed: number;
    todayCompleted: number;
    yesterdayCompleted: number;
  };
  deals: {
    total: number;
    value: number;
    won: number;
    lost: number;
    wonValue: number;
    byStage: { _id: string; count: number; value: number }[];
    active?: number;
  };
  campaigns: { total: number };
  clients: { total: number };
  recentLeads: { _id: string; name: string; status?: string }[];
  overdueFollows: { _id: string; leadName?: string; scheduledAt: string; notes?: string }[];
  recentDeals: { _id: string; title: string; stage?: string; value?: number }[];
  recentFollowups?: { _id: string; leadName?: string; scheduledAt: string; status?: string }[];
  charts: { leads30: { date: string; count: number }[]; followups30: { date: string; count: number }[] };
};

function StatCard({
  href,
  label,
  value,
  icon: Icon,
  tone = "blue",
}: {
  href: string;
  label: string;
  value: string | number;
  icon: typeof Users;
  tone?: "blue" | "green" | "amber" | "red" | "violet" | "sky" | "slate";
}) {
  const wrap =
    tone === "green"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : tone === "red"
          ? "bg-rose-50 text-rose-600"
          : tone === "violet"
            ? "bg-violet-50 text-violet-600"
            : tone === "sky"
              ? "bg-sky-50 text-sky-600"
              : tone === "slate"
                ? "bg-slate-100 text-slate-600"
                : "bg-blue-50 text-blue-600";
  return (
    <Link
      href={href}
      className="flex min-h-[108px] items-center gap-4 rounded-2xl border border-[#e8eef6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", wrap)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{label}</span>
      </span>
    </Link>
  );
}

export default function CrmPage() {
  const t = useTranslations();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertOpen, setAlertOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/summary");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setData(json.data);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("nav.crmDashboard")} subtitle={t("crm.subtitle")} />
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      ) : null}
      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && data ? (
        <>
          {data.followups.overdue > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-3 text-left"
                onClick={() => setAlertOpen((v) => !v)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Red Alert — {data.followups.overdue} overdue follow-ups need attention
                </span>
                <span className="text-xs opacity-80">{alertOpen ? "Hide" : "Show"}</span>
              </button>
              {alertOpen ? (
                <div className="divide-y divide-white/15 bg-rose-50/95 text-slate-800">
                  {data.overdueFollows.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted">{t("common.noData")}</p>
                  ) : (
                    data.overdueFollows.map((row) => (
                      <div key={row._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div>
                          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-rose-600">Urgent</p>
                          <p className="font-semibold">{row.leadName || "Follow-up"}</p>
                          <p className="text-xs text-slate-500">Due: {formatDateBD(row.scheduledAt)}</p>
                          {row.notes ? <p className="mt-1 text-sm text-slate-600">{row.notes}</p> : null}
                        </div>
                        <Link href="/crm/followups" className="gp-btn gp-btn-ghost text-xs">
                          View →
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard href="/crm/leads" label="Total Leads" value={data.leads.total} icon={Target} tone="blue" />
            <StatCard href="/crm/leads" label="Qualified Leads" value={data.leads.qualified ?? 0} icon={Handshake} tone="green" />
            <StatCard href="/crm/leads" label="New Leads Today" value={data.leads.today} icon={UserPlus} tone="sky" />
            <StatCard href="/crm/followups" label="Upcoming (7d)" value={data.followups.upcoming} icon={Calendar} tone="violet" />
            <StatCard href="/crm/deals" label="Active Deals" value={data.deals.active ?? data.deals.total} icon={Briefcase} tone="amber" />
            <StatCard href="/crm/deals" label="Won Deals" value={data.deals.won} icon={CheckCircle2} tone="green" />
            <StatCard href="/crm/campaigns" label="Campaign Leads" value={data.leads.fromCampaigns ?? 0} icon={Megaphone} tone="violet" />
            <StatCard href="/crm/leads" label="Conversion" value={`${data.leads.conversion ?? 0}%`} icon={Target} tone="blue" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#e8eef6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-sm text-slate-500">Pipeline Value</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatBDT(data.deals.value)}</p>
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-sm text-slate-500">Won Deal Value</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatBDT(data.deals.wonValue)}</p>
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-sm text-slate-500">Open Leads</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{data.leads.open}</p>
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-sm text-slate-500">Won / Lost Leads</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {data.leads.won} / {data.leads.lost}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">Leads by Rating</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard href="/crm/leads" label="Hot Lead" value={data.leads.hot} icon={Flame} tone="red" />
              <StatCard href="/crm/leads" label="Warm Lead" value={data.leads.warm} icon={Sun} tone="amber" />
              <StatCard href="/crm/leads" label="Cold Lead" value={data.leads.cold} icon={Snowflake} tone="sky" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="mb-3 text-sm font-semibold">Leads added in last 30 days</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.leads30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} hide={false} interval={4} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#dbeafe" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="mb-3 text-sm font-semibold">Follow-ups added in last 30 days</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.followups30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#10b981" fill="#d1fae5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="mb-3 text-sm font-semibold">Lead sources</p>
              <div className="h-56">
                {(data.leads.bySource || []).length === 0 ? (
                  <EmptyState message={t("common.noData")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data.leads.bySource || []).map((s) => ({ source: s._id || "n/a", count: s.count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="mb-3 text-sm font-semibold">Sales pipeline</p>
              <div className="h-56">
                {data.deals.byStage.length === 0 ? (
                  <EmptyState message={t("common.noData")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.deals.byStage.map((s) => ({ stage: s._id || "n/a", count: s.count, value: s.value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Recent leads</p>
                <Link href="/crm/leads" className="text-sm text-[var(--gp-primary)]">
                  View
                </Link>
              </div>
              {data.recentLeads.length === 0 ? (
                <EmptyState message={t("common.noData")} />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recentLeads.map((row) => (
                    <li key={row._id} className="flex justify-between gap-2 border-b border-line pb-2">
                      <span className="truncate">{row.name}</span>
                      <span className="text-muted">{row.status || "open"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Overdue follow-ups</p>
                <Link href="/crm/followups" className="text-sm text-[var(--gp-primary)]">
                  View
                </Link>
              </div>
              {data.overdueFollows.length === 0 ? (
                <EmptyState message={t("common.noData")} />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.overdueFollows.map((row) => (
                    <li key={row._id} className="flex justify-between gap-2 border-b border-line pb-2">
                      <span className="truncate">{row.leadName || "Lead"}</span>
                      <span className="text-muted">{formatDateBD(row.scheduledAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Pipeline</p>
                <Link href="/crm/deals" className="text-sm text-[var(--gp-primary)]">
                  View
                </Link>
              </div>
              {data.recentDeals.length === 0 ? (
                <EmptyState message={t("common.noData")} />
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.recentDeals.map((row) => (
                    <li key={row._id} className="flex justify-between gap-2 border-b border-line pb-2">
                      <span className="truncate">{row.title}</span>
                      <span className="text-muted">
                        {row.stage} · {formatBDT(row.value || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Recent follow-ups</p>
                <Link href="/crm/followups" className="text-sm text-[var(--gp-primary)]">View</Link>
              </div>
              {(data.recentFollowups || []).length === 0 ? (
                <EmptyState message={t("common.noData")} />
              ) : (
                <ul className="space-y-2 text-sm">
                  {(data.recentFollowups || []).map((row) => (
                    <li key={row._id} className="flex justify-between gap-2 border-b border-line pb-2">
                      <span className="truncate">{row.leadName || "Follow-up"}</span>
                      <span className="text-muted">{row.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
