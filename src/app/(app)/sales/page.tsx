"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState, Field, FilterBar, Modal, PageHeader } from "@/components/ui";
import { InvoiceActions } from "@/components/InvoiceActions";
import { CrudForm } from "@/components/CrudForm";
import { getCrudConfig } from "@/lib/crud-config";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Sale = {
  _id: string;
  invoiceNo: string;
  customerName: string;
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Sale | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const salesCrud = getCrudConfig("sales");

  async function load() {
    const qs = new URLSearchParams({ limit: "100" });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    const res = await fetch(`/api/sales?${qs}`);
    const json = await res.json();
    setData(json.data || []);
    setSummary(json.summary || { grandTotal: 0, dueAmount: 0, count: 0 });
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
      <PageHeader
        title={t("sales.title")}
        actions={
          <Link href="/pos" className="gp-btn gp-btn-primary">
            {t("nav.pos")}
          </Link>
        }
      />

      <FilterBar>
        <Field label={t("common.search")}>
          <input className="gp-input" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label={t("dashboard.fromDate")}>
          <input type="date" className="gp-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("dashboard.toDate")}>
          <input type="date" className="gp-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label={t("common.status")}>
          <select className="gp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("common.all")}</option>
            <option value="final">{t("sales.statusFinal")}</option>
            <option value="draft">{t("sales.statusDraft")}</option>
            <option value="quotation">{t("sales.statusQuotation")}</option>
          </select>
        </Field>
      </FilterBar>
      <button type="button" className="gp-btn gp-btn-primary mb-5" onClick={load}>
        {t("dashboard.apply")}
      </button>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="gp-card p-4">
          <p className="text-muted">{t("common.total")}</p>
          <p className="gp-money text-2xl text-[var(--gp-ink)]">{formatBDT(summary.grandTotal, locale)}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-muted">{t("common.due")}</p>
          <p className="gp-money text-2xl text-[var(--gp-ink)]">{formatBDT(summary.dueAmount, locale)}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-muted">{t("pos.items")}</p>
          <p className="text-2xl font-extrabold">{summary.count}</p>
        </div>
      </div>

      <div className="gp-table-wrap overflow-auto">
        {data.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table">
            <thead>
              <tr>
                <th>{t("sales.invoiceNo")}</th>
                <th>{t("sales.customer")}</th>
                <th>{t("common.date")}</th>
                <th>{t("common.grandTotal")}</th>
                <th>{t("common.due")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s._id}>
                  <td>
                    <Link
                      href={`/sales/${s._id}/invoice`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {s.invoiceNo}
                    </Link>
                  </td>
                  <td>{s.customerName}</td>
                  <td>{formatDateBD(s.saleDate, locale)}</td>
                  <td className="font-bold">{formatBDT(s.grandTotal, locale)}</td>
                  <td>{formatBDT(s.dueAmount, locale)}</td>
                  <td>
                    <span className="gp-badge gp-badge-success capitalize">{s.status}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                      <InvoiceActions saleId={s._id} compact />
                      <button
                        type="button"
                        className="gp-btn gp-btn-ghost min-h-9 px-2"
                        onClick={() => {
                          setEditing(s);
                          setFormOpen(true);
                        }}
                        title={t("common.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="gp-btn gp-btn-danger min-h-9 px-2"
                        onClick={() => removeSale(s._id)}
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
