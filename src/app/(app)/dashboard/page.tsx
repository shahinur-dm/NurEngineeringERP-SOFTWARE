"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Banknote,
  TrendingUp,
  ShoppingCart,
  Undo2,
  AlertTriangle,
  Wallet,
  CreditCard,
  Receipt,
  Package,
} from "lucide-react";
import { EmptyState, Field, FilterBar, KpiCard, Modal, PageHeader } from "@/components/ui";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Dash = {
  kpis: {
    totalSales: number;
    net: number;
    invoiceDue: number;
    sellReturn: number;
    totalPurchase: number;
    purchaseDue: number;
    purchaseReturn: number;
    expenses: number;
    todaySales: number;
    lowStockCount: number;
  };
  trend: { _id: string; total: number }[];
  charts?: {
    salesByStatus?: { _id: string; total: number }[];
    expensesByCategory?: { _id: string; total: number }[];
  };
  recentSales: {
    _id: string;
    invoiceNo: string;
    customerName: string;
    grandTotal: number;
    saleDate: string;
  }[];
  lowStock: { name: string; nameBn?: string; sku: string; qty: number }[];
  locations: { _id: string; name: string }[];
  widgets: {
    salesPaymentDue: { invoiceNo?: string; customerName?: string; dueAmount?: number }[];
    purchasePaymentDue: { referenceNo?: string; supplierName?: string; dueAmount?: number }[];
    purchaseRequisitions: { reqNo?: string; locationName?: string; status?: string }[];
    pendingShipments: { shipmentNo?: string; customerName?: string; status?: string }[];
  };
};

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [data, setData] = useState<Dash | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [locationId, setLocationId] = useState("");
  const [modal, setModal] = useState<{ title: string; rows: Record<string, unknown>[] } | null>(
    null,
  );

  async function load() {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (locationId) qs.set("locationId", locationId);
    const res = await fetch(`/api/dashboard?${qs}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openBreakdown(type: string, title: string) {
    const qs = new URLSearchParams({ breakdown: type });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (locationId) qs.set("locationId", locationId);
    const res = await fetch(`/api/dashboard?${qs}`);
    const json = await res.json();
    setModal({ title, rows: json.rows || [] });
  }

  const chartData = useMemo(
    () => (data?.trend || []).map((d) => ({ date: d._id.slice(5), total: d.total })),
    [data],
  );

  const widgets = data?.widgets;

  return (
    <div className="pb-10">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.clickBreakdown")} />

      <FilterBar>
        <Field label={t("dashboard.fromDate")}>
          <input type="date" className="gp-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("dashboard.toDate")}>
          <input type="date" className="gp-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label={t("dashboard.location")}>
          <select className="gp-input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">{t("dashboard.allLocations")}</option>
            {(data?.locations || []).map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2">
          <button type="button" className="gp-btn gp-btn-primary flex-1" onClick={load}>
            {t("dashboard.apply")}
          </button>
          <button
            type="button"
            className="gp-btn gp-btn-ghost flex-1"
            onClick={() => {
              setFrom("");
              setTo("");
              setLocationId("");
              setTimeout(load, 0);
            }}
          >
            {t("dashboard.reset")}
          </button>
        </div>
      </FilterBar>

      <div className="mb-8 space-y-4">
        <h2 className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted">
          {locale === "bn" ? "প্রধান সারাংশ" : "Primary Overview"}
        </h2>
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("dashboard.totalSales")}
            value={data?.kpis.totalSales || 0}
            icon={TrendingUp}
            hint={t("dashboard.clickBreakdown")}
            onClick={() => openBreakdown("sales", t("dashboard.totalSales"))}
          />
          <KpiCard
            label={t("dashboard.net")}
            value={data?.kpis.net || 0}
            icon={Banknote}
            tone="info"
            onClick={() => openBreakdown("sales", t("dashboard.net"))}
          />
          <KpiCard
            label={t("dashboard.totalPurchase")}
            value={data?.kpis.totalPurchase || 0}
            icon={ShoppingCart}
            onClick={() => openBreakdown("purchases", t("dashboard.totalPurchase"))}
          />
          <KpiCard
            label={t("dashboard.expenses")}
            value={data?.kpis.expenses || 0}
            icon={Wallet}
            tone="danger"
            onClick={() => openBreakdown("expenses", t("dashboard.expenses"))}
          />
        </div>
      </div>

      <div className="mb-8 space-y-4">
        <h2 className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted">
          {locale === "bn" ? "বকেয়া ও ফেরত" : "Due & Returns"}
        </h2>
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("dashboard.invoiceDue")}
            value={data?.kpis.invoiceDue || 0}
            icon={AlertTriangle}
            tone="warn"
            hint={t("dashboard.clickBreakdown")}
            onClick={() => openBreakdown("due", t("dashboard.invoiceDue"))}
          />
          <KpiCard
            label={t("dashboard.purchaseDue")}
            value={data?.kpis.purchaseDue || 0}
            icon={CreditCard}
            tone="warn"
            onClick={() => openBreakdown("purchase-due", t("dashboard.purchaseDue"))}
          />
          <KpiCard
            label={t("dashboard.sellReturn")}
            value={data?.kpis.sellReturn || 0}
            icon={Undo2}
            tone="danger"
            onClick={() => openBreakdown("sell-returns", t("dashboard.sellReturn"))}
          />
          <KpiCard
            label={t("dashboard.purchaseReturn")}
            value={data?.kpis.purchaseReturn || 0}
            icon={Receipt}
            tone="danger"
            onClick={() => openBreakdown("purchase-returns", t("dashboard.purchaseReturn"))}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        <div className="gp-card p-5 xl:col-span-2 shadow-sm border border-line">
          <h2 className="mb-4 text-lg font-bold text-[var(--gp-ink)]">
            {t("dashboard.salesTrend")}
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatBDT(Number(v || 0), locale)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#2563eb" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gp-card p-5 shadow-sm border border-line">
          <h2 className="mb-4 text-lg font-bold text-[var(--gp-ink)]">Expense Breakdown</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.charts?.expensesByCategory || []}
                  dataKey="total"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {(data?.charts?.expensesByCategory || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={["#2563eb", "#f59e0b", "#059669", "#dc2626", "#7c3aed"][index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatBDT(Number(v || 0), locale)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="gp-card p-5 xl:col-span-2 shadow-sm border border-line">
          <h2 className="mb-4 text-lg font-bold text-[var(--gp-ink)]">Sales by Status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.salesByStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatBDT(Number(v || 0), locale)} cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gp-card p-5 shadow-sm border border-line">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--gp-ink)] flex items-center gap-2">
              <Package className="w-5 h-5 text-warn" />
              {t("dashboard.stockAlerts")}
            </h2>
            <Link href="/reports/stock" className="text-sm font-semibold text-primary hover:underline">
              {t("common.view")} →
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.lowStock || []).length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              data?.lowStock.map((p) => (
                <div key={p.sku} className="rounded-xl border border-line px-3 py-3 hover:bg-[#fafbfc] transition">
                  <p className="font-bold text-sm text-[var(--gp-ink)]">{locale === "bn" && p.nameBn ? p.nameBn : p.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    SKU: {p.sku} · QTY: <span className="text-danger font-bold">{p.qty}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid auto-rows-fr gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <WidgetCard
          title={t("dashboard.salesPaymentDue")}
          href="/reports/sell-payment"
          onViewAll={() => openBreakdown("due", t("dashboard.salesPaymentDue"))}
        >
          {(widgets?.salesPaymentDue || []).length === 0 ? (
            <EmptyState message={t("common.noData")} />
          ) : (
            widgets?.salesPaymentDue.map((s, i) => (
              <WidgetRow
                key={i}
                label={s.customerName || s.invoiceNo || "—"}
                value={formatBDT(s.dueAmount || 0, locale)}
              />
            ))
          )}
        </WidgetCard>

        <WidgetCard
          title={t("dashboard.purchasePaymentDue")}
          href="/reports/purchase-payment"
          onViewAll={() => openBreakdown("purchase-due", t("dashboard.purchasePaymentDue"))}
        >
          {(widgets?.purchasePaymentDue || []).length === 0 ? (
            <EmptyState message={t("common.noData")} />
          ) : (
            widgets?.purchasePaymentDue.map((p, i) => (
              <WidgetRow
                key={i}
                label={p.supplierName || p.referenceNo || "—"}
                value={formatBDT(p.dueAmount || 0, locale)}
              />
            ))
          )}
        </WidgetCard>

        <WidgetCard title={t("dashboard.salesOrder")} href="/sales/drafts">
          <WidgetRow label={t("dashboard.todaySales")} value={formatBDT(data?.kpis.todaySales || 0, locale)} />
          <div className="pt-2 text-right">
            <Link href="/sales/drafts" className="text-sm font-semibold text-primary hover:underline">
              {t("nav.listDrafts")} →
            </Link>
          </div>
        </WidgetCard>

        <WidgetCard
          title={t("dashboard.purchaseRequisition")}
          href="/purchases/requisition"
          onViewAll={() => openBreakdown("requisitions", t("dashboard.purchaseRequisition"))}
        >
          {(widgets?.purchaseRequisitions || []).length === 0 ? (
            <EmptyState message={t("common.noData")} />
          ) : (
            widgets?.purchaseRequisitions.map((r, i) => (
              <WidgetRow key={i} label={r.reqNo || "—"} value={r.status || ""} />
            ))
          )}
        </WidgetCard>

        <WidgetCard
          title={t("dashboard.pendingShipments")}
          href="/sales/shipments"
          onViewAll={() => openBreakdown("shipments", t("dashboard.pendingShipments"))}
        >
          {(widgets?.pendingShipments || []).length === 0 ? (
            <EmptyState message={t("common.noData")} />
          ) : (
            widgets?.pendingShipments.map((s, i) => (
              <WidgetRow key={i} label={s.shipmentNo || "—"} value={s.customerName || s.status || ""} />
            ))
          )}
        </WidgetCard>
      </div>

      <div className="gp-card mt-8 overflow-auto p-5 shadow-sm border-line">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--gp-ink)]">{t("dashboard.recentSales")}</h2>
          <Link href="/sales" className="text-sm font-semibold text-primary hover:underline">
            {t("nav.allSales")} →
          </Link>
        </div>
        <table className="gp-table">
          <thead>
            <tr>
              <th>{t("sales.invoiceNo")}</th>
              <th>{t("sales.customer")}</th>
              <th>{t("common.date")}</th>
              <th>{t("common.grandTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentSales || []).map((s) => (
              <tr key={s._id}>
                <td className="font-semibold">
                  <Link href={`/sales/${s._id}/invoice`} className="text-primary hover:underline">
                    {s.invoiceNo}
                  </Link>
                </td>
                <td>{s.customerName}</td>
                <td>{formatDateBD(s.saleDate, locale)}</td>
                <td className="font-bold">{formatBDT(s.grandTotal, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} title={modal?.title || ""} onClose={() => setModal(null)} wide>
        {!modal?.rows?.length ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-auto">
            <table className="gp-table">
              <thead>
                <tr>
                  {Object.keys(modal.rows[0])
                    .filter((k) => !k.startsWith("_") && k !== "items" && k !== "payments" && k !== "stocks")
                    .slice(0, 6)
                    .map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {modal.rows.map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row)
                      .filter(([k]) => !k.startsWith("_") && k !== "items" && k !== "payments" && k !== "stocks")
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <td key={k}>
                          {typeof v === "object" && v !== null
                            ? JSON.stringify(v).slice(0, 40)
                            : String(v ?? "")}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

function WidgetCard({
  title,
  href,
  onViewAll,
  children,
}: {
  title: string;
  href?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="gp-card flex h-full min-h-[220px] flex-col p-5">
      <div className="mb-4 flex min-h-[2.25rem] items-center justify-between border-b border-line pb-3">
        <h3 className="text-[0.95rem] font-bold text-[var(--gp-ink)]">{title}</h3>
        {onViewAll ? (
          <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={onViewAll}>
            {t("common.view")} →
          </button>
        ) : href ? (
          <Link href={href} className="text-sm font-semibold text-primary hover:underline">
            {t("common.view")} →
          </Link>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col space-y-2">{children}</div>
    </div>
  );
}

function WidgetRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-[#fbfcfb] px-3 py-2.5 text-sm hover:border-[color-mix(in_oklab,var(--gp-primary)_30%,white)] transition">
      <span className="font-medium text-[var(--gp-ink)]">{label}</span>
      <span className="gp-money text-[var(--gp-primary)] font-bold">{value}</span>
    </div>
  );
}
