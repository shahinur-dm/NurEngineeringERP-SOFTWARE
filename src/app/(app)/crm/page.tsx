"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, KpiCard, PageHeader } from "@/components/ui";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Summary = {
  leads: { total: number; open: number; won: number; lost: number; hot: number; warm: number; cold: number };
  followups: { total: number; overdue: number; today: number; upcoming: number };
  deals: { total: number; value: number; byStage: { _id: string; count: number; value: number }[] };
  campaigns: { total: number };
  clients: { total: number };
  recentLeads: { _id: string; name: string; status?: string; rating?: string; mobile?: string }[];
  overdueFollows: { _id: string; leadName?: string; scheduledAt: string; status?: string }[];
  recentDeals: { _id: string; title: string; stage?: string; value?: number }[];
};

export default function CrmPage() {
  const t = useTranslations();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <div>
      <PageHeader title={t("nav.crmDashboard")} subtitle={t("crm.subtitle")} />
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label={t("crm.leads")} value={data.leads.total} hint={`${data.leads.open} open`} />
            <KpiCard label="Won / Lost" value={`${data.leads.won} / ${data.leads.lost}`} />
            <KpiCard
              label={t("crm.followups")}
              value={data.followups.total}
              hint={`${data.followups.overdue} overdue · ${data.followups.today} today`}
              tone={data.followups.overdue > 0 ? "danger" : "default"}
            />
            <KpiCard label={t("crm.deals")} value={data.deals.total} hint={formatBDT(data.deals.value)} />
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Hot / Warm / Cold" value={`${data.leads.hot} / ${data.leads.warm} / ${data.leads.cold}`} />
            <KpiCard label={t("crm.clients")} value={data.clients.total} />
            <KpiCard label={t("crm.campaigns")} value={data.campaigns.total} />
            <KpiCard label="Upcoming follow-ups (7d)" value={data.followups.upcoming} />
          </div>
          {data.followups.overdue > 0 ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800">
                {data.followups.overdue} overdue follow-ups need attention
              </p>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="gp-card p-4">
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
                      <span>{row.name}</span>
                      <span className="text-muted">{row.status || "open"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="gp-card p-4">
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
                      <span>{row.leadName || "Lead"}</span>
                      <span className="text-muted">{formatDateBD(row.scheduledAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="gp-card p-4">
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
                      <span>{row.title}</span>
                      <span className="text-muted">
                        {row.stage} · {formatBDT(row.value || 0)}
                      </span>
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
