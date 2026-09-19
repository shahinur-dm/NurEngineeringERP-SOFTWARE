"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { EmptyState, Modal } from "@/components/ui";
import { InvoiceActions, PaymentStatusBadge } from "@/components/InvoiceActions";
import { CrudForm } from "@/components/CrudForm";
import { getCrudConfig } from "@/lib/crud-config";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Sale = {
  _id: string;
  invoiceNo?: string;
  quotationNo?: string;
  salesOrderNo?: string;
  referenceNo?: string;
  customerName: string;
  customerId?: string;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  saleDate: string;
  status: string;
};

export default function SalesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [data, setData] = useState<Sale[]>([]);
  const [summary, setSummary] = useState({ grandTotal: 0, dueAmount: 0, count: 0 });
  const [q, setQ] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const salesCrud = getCrudConfig("sales");

  async function load(search = q) {
    const qs = new URLSearchParams({ limit: "100" });
    if (search) qs.set("q", search);
    try {
      const res = await fetch(`/api/sales?${qs}`);
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.data)) {
        setLoadError(true);
        setData([]);
        setSummary({ grandTotal: 0, dueAmount: 0, count: 0 });
        return;
      }
      setLoadError(false);
      setData(json.data);
      setSummary(json.summary || { grandTotal: 0, dueAmount: 0, count: 0 });
    } catch {
      setLoadError(true);
      setData([]);
      setSummary({ grandTotal: 0, dueAmount: 0, count: 0 });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveEdit(formData: Record<string, unknown>) {
    if (!editing || !salesCrud) return;
    await fetch(`/api/sales/${editing._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    setFormOpen(false);
    setEditing(null);
    load();
  }

  async function removeSale(id: string) {
    if (!confirm(locale === "bn" ? "মুছে ফেলবেন?" : "Delete?")) return;
    await fetch(`/api/sales/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-2 flex flex-col gap-2 border-b border-line pb-2 xl:flex-row xl:items-center">
        <h1 className="gp-display shrink-0 text-2xl font-bold tracking-tight text-[var(--gp-ink)]">
          {t("sales.title")}
        </h1>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 xl:flex-nowrap">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="gp-input gp-input-icon-left"
              value={q}
              onChange={(e) => {
                const value = e.target.value;
                setQ(value);
                void load(value);
              }}
              placeholder={t("common.search")}
            />
          </div>
          <div className="flex min-h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm">
            <span className="text-muted">{t("common.total")}</span>
            <b className="gp-money whitespace-nowrap">{formatBDT(summary.grandTotal, locale)}</b>
          </div>
          <div className="flex min-h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm">
            <span className="text-muted">{t("common.due")}</span>
            <b className="gp-money whitespace-nowrap">{formatBDT(summary.dueAmount, locale)}</b>
          </div>
          <div className="flex min-h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm">
            <span className="text-muted">{t("pos.items")}</span>
            <b>{summary.count}</b>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/sales/quotations" className="gp-btn gp-btn-ghost">
              {t("nav.listQuotations")}
            </Link>
            <Link href="/pos" className="gp-btn gp-btn-primary">
              {t("nav.pos")}
            </Link>
          </div>
        </div>
      </div>

      <div className="gp-table-wrap !overflow-x-auto lg:-ml-12 lg:w-[calc(100%+3rem)]">
        {data.length === 0 ? (
          <EmptyState message={loadError ? t("common.error") : t("common.noData")} />
        ) : (
          <table className="gp-table min-w-[960px] lg:w-full lg:min-w-0 lg:table-fixed [&_td]:py-2 [&_th]:py-2">
            <colgroup>
              <col className="lg:w-[11%]" />
              <col className="lg:w-[13%]" />
              <col className="lg:w-[13%]" />
              <col className="lg:w-[14%]" />
              <col className="lg:w-[9%]" />
              <col className="lg:w-[11%]" />
              <col className="lg:w-[8%]" />
              <col className="lg:w-[9%]" />
              <col className="lg:w-[7%]" />
              <col className="lg:w-[5%]" />
            </colgroup>
            <thead>
              <tr>
                <th>{t("sales.invoiceNo")}</th>
                <th>{t("sales.quotationNo")}</th>
                <th>{t("sales.referenceNo")}</th>
                <th>{t("sales.customer")}</th>
                <th>{t("common.date")}</th>
                <th>{t("common.grandTotal")}</th>
                <th>{t("common.due")}</th>
                <th>{t("sales.paymentStatus")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s._id}>
                  <td>
                    {s.status === "quotation" ? (
                      <Link
                        href={`/sales/${s._id}/quotation`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {s.quotationNo || "—"}
                      </Link>
                    ) : (
                      <Link
                        href={`/sales/${s._id}/invoice`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {s.invoiceNo || "—"}
                      </Link>
                    )}
                  </td>
                  <td className="min-w-0 max-w-0 overflow-hidden align-top">
                    {s.quotationNo ? (
                      <Link
                        href={`/sales/${s._id}/quotation`}
                        className="block max-w-full break-all text-primary hover:underline"
                        title={s.quotationNo}
                      >
                        {s.quotationNo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="min-w-0 max-w-0 overflow-hidden align-top">
                    <span className="block max-w-full break-all font-mono text-sm" title={s.referenceNo || ""}>
                      {s.referenceNo || "—"}
                    </span>
                  </td>
                  <td className="min-w-0">
                    {s.customerId ? (
                      <Link
                        href={`/contacts/${s.customerId}/statement`}
                        className="block truncate font-semibold text-primary hover:underline"
                        title={s.customerName}
                      >
                        {s.customerName}
                      </Link>
                    ) : (
                      <span className="block truncate" title={s.customerName}>{s.customerName}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{formatDateBD(s.saleDate, locale)}</td>
                  <td className="whitespace-nowrap font-bold">{formatBDT(s.grandTotal, locale)}</td>
                  <td className="whitespace-nowrap">{formatBDT(s.dueAmount, locale)}</td>
                  <td>
                    <PaymentStatusBadge grandTotal={s.grandTotal} paidAmount={s.paidAmount} />
                  </td>
                  <td>
                    <span className="gp-badge gp-badge-success capitalize">{s.status}</span>
                  </td>
                  <td className="overflow-visible whitespace-nowrap pr-2">
                    <InvoiceActions
                      saleId={s._id}
                      saleStatus={s.status}
                      asMenu
                      onEdit={() => {
                        setEditing(s);
                        setFormOpen(true);
                      }}
                      onDelete={() => removeSale(s._id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={formOpen && !!salesCrud}
        title={t("common.edit")}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        {salesCrud && editing ? (
          <CrudForm
            config={salesCrud}
            initial={editing}
            isEdit
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSubmit={saveEdit}
          />
        ) : null}
      </Modal>
    </div>
  );
}
