"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  AreaChart,
  Area,
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
import { EmptyState, Field, KpiCard, Modal } from "@/components/ui";
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
  const todayLabel = new Date().toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const tooltipStyle = {
    borderRadius: 14,
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  };
  const expenseColors = ["#2563eb", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
  const statusColors = ["#2563eb", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4"];

  return (
    <div className="dash-premium pb-6">
      <div className="dash-hero">
        <h1 className="gp-display">{t("dashboard.title")}</h1>
        <p>
          {t("dashboard.clickBreakdown")} · {todayLabel}
        </p>
      </div>

      <div className="dash-filter">
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
      </div>

      <div className="mb-5">
        <h2 className="dash-section-title">
          {locale === "bn" ? "প্রধান সারাংশ" : "Primary Overview"}
        </h2>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mb-5">
        <h2 className="dash-section-title">
          {locale === "bn" ? "বকেয়া ও ফেরত" : "Due & Returns"}
        </h2>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="dash-panel xl:col-span-2">
          <h2 className="mb-4 text-[var(--gp-ink)]">{t("dashboard.salesTrend")}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatBDT(Number(v || 0), locale)} contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#salesTrendFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-panel">
          <h2 className="mb-4 text-[var(--gp-ink)]">{t("dashboard.expenseBreakdown")}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.charts?.expensesByCategory || []}
                  dataKey="total"
                  nameKey="_id"
                  cx="50%"
                  cy="46%"
                  innerRadius={68}
                  outerRadius={92}
                  paddingAngle={4}
                  stroke="#fff"
                  strokeWidth={3}
                >
                  {(data?.charts?.expensesByCategory || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={expenseColors[index % expenseColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatBDT(Number(v || 0), locale)} contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="dash-panel xl:col-span-2">
          <h2 className="mb-4 text-[var(--gp-ink)]">{t("dashboard.salesByStatus")}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.salesByStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatBDT(Number(v || 0), locale)} cursor={{ fill: "#f8fafc" }} contentStyle={tooltipStyle} />
                <Bar dataKey="total" radius={[10, 10, 4, 4]} barSize={42}>
                  {(data?.charts?.salesByStatus || []).map((_, index) => (
                    <Cell key={`bar-${index}`} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[var(--gp-ink)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#ea580c]">
                <Package className="h-5 w-5" />
              </span>
              {t("dashboard.stockAlerts")}
            </h2>
            <Link href="/reports/stock" className="dash-link">
              {t("common.view")} →
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.lowStock || []).length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              data?.lowStock.map((p) => (
                <div key={p.sku} className="rounded-2xl border border-[#eef2f7] bg-[#fafbfc] px-3 py-2.5">
                  <p className="text-sm font-bold text-[var(--gp-ink)]">{locale === "bn" && p.nameBn ? p.nameBn : p.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    SKU: {p.sku} · QTY: <span className="font-bold text-danger">{p.qty}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid auto-rows-fr gap-4 lg:grid-cols-2 xl:grid-cols-3">
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

      <div className="dash-panel mt-5 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[var(--gp-ink)]">{t("dashboard.recentSales")}</h2>
          <Link href="/sales" className="dash-link">
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
    <div className="dash-panel flex h-full min-h-[200px] flex-col">
      <div className="mb-3 flex min-h-[2rem] items-center justify-between pb-2.5">
        <h3 className="text-[0.98rem] font-extrabold text-[var(--gp-ink)]">{title}</h3>
        {onViewAll ? (
          <button type="button" className="dash-link" onClick={onViewAll}>
            {t("common.view")} →
          </button>
        ) : href ? (
          <Link href={href} className="dash-link">
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
    <div className="flex items-center justify-between rounded-2xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5 text-sm">
      <span className="font-semibold text-[var(--gp-ink)]">{label}</span>
      <span className="gp-money font-bold text-[var(--gp-primary)]">{value}</span>
    </div>
  );
}
