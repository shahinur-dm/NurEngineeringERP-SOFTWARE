"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Search } from "lucide-react";
import { EmptyState, Field, Modal } from "@/components/ui";
import { InvoiceActions } from "@/components/InvoiceActions";
import { DateRangeExcelBar, downloadExcelResponse } from "@/components/DateRangeExcelBar";
import { formatBDT, formatDateBD } from "@/lib/utils";

const PAGE_SIZE = 20;

type QuoteItem = {
  productId?: string;
  name: string;
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
  unit?: string;
  imageUrl?: string;
};

type Quote = {
  _id: string;
  quotationNo?: string;
  referenceNo?: string;
  invoiceNo?: string;
  customerName: string;
  customerId?: string;
  customerMobile?: string;
  customerAddress?: string;
  customerEmail?: string;
  pfNo?: string;
  poNo?: string;
  challanNo?: string;
  binNo?: string;
  subject?: string;
  note?: string;
  terms?: string;
  documentBody?: string;
  items?: QuoteItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  paidAmount?: number;
  dueAmount?: number;
  grandTotal: number;
  saleDate: string;
  status: string;
  hasSignature?: boolean;
};

export default function QuotationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [data, setData] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editItems, setEditItems] = useState<QuoteItem[]>([]);
  const [saving, setSaving] = useState(false);

  const lineDisc = editItems.reduce((a, i) => a + Number(i.discount || 0), 0);
  const calcSubtotal = editItems.reduce((a, i) => a + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
  const orderDisc = Number(editForm.discount || 0);
  const calcGrand = Math.max(
    0,
    calcSubtotal - lineDisc - orderDisc + Number(editForm.tax || 0) + Number(editForm.shipping || 0),
  );
  const calcDue = Math.max(0, calcGrand - Number(editForm.paidAmount || 0));

  async function load(nextPage = 1, search = q) {
    const qs = new URLSearchParams({
      limit: String(PAGE_SIZE),
      page: String(nextPage),
      status: "quotation",
    });
    const value = search.trim();
    const dateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      qs.set("from", date);
      qs.set("to", date);
    } else if (value) {
      qs.set("q", value);
    }
    const res = await fetch(`/api/sales?${qs}`);
    const json = await res.json();
    setData(json.data || []);
    setTotal(Number(json.total) || 0);
    setPage(nextPage);
  }

  useEffect(() => {
    void load(1);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  async function openEdit(quote: Quote) {
    const res = await fetch(`/api/sales/${quote._id}`);
    const json = await res.json();
    const full = (json.data || quote) as Quote;
    const items = (full.items || []).map((it) => ({
      productId: it.productId,
      name: String(it.name || ""),
      sku: String(it.sku || ""),
      description: String(it.description || ""),
      qty: Number(it.qty || 0),
      unitPrice: Number(it.unitPrice || 0),
      discount: Number(it.discount || 0),
      taxPercent: Number(it.taxPercent || 0),
      unit: it.unit,
      imageUrl: it.imageUrl,
    }));
    const line = items.reduce((a, i) => a + i.discount, 0);
    setEditing(full);
    setEditItems(items);
    setEditForm({
      quotationNo: full.quotationNo || "",
      referenceNo: full.referenceNo || "",
      customerName: full.customerName || "",
      customerMobile: full.customerMobile || "",
      customerAddress: full.customerAddress || "",
      customerEmail: full.customerEmail || "",
      pfNo: full.pfNo || full.poNo || "",
      challanNo: full.challanNo || "",
      binNo: full.binNo || "",
      subject: full.subject || "",
      saleDate: full.saleDate ? String(full.saleDate).slice(0, 10) : "",
      discount: String(Math.max(0, Number(full.discount || 0) - line)),
      tax: String(full.tax || 0),
      shipping: String(full.shipping || 0),
      paidAmount: String(full.paidAmount || 0),
      note: full.note || "",
      terms: full.terms || "",
      documentBody: full.documentBody || "",
      hasSignature: full.hasSignature ? "true" : "false",
    });
  }

  function updateEditItem(index: number, patch: Partial<QuoteItem>) {
    setEditItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const storedDiscount = lineDisc + orderDisc;
      const res = await fetch(`/api/sales/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationNo: editForm.quotationNo,
          referenceNo: editForm.referenceNo,
          customerName: editForm.customerName,
          customerMobile: editForm.customerMobile,
          customerAddress: editForm.customerAddress,
          customerEmail: editForm.customerEmail,
          pfNo: editForm.pfNo,
          challanNo: editForm.challanNo,
          binNo: editForm.binNo,
          subject: editForm.subject,
          saleDate: editForm.saleDate,
          discount: storedDiscount,
          tax: Number(editForm.tax || 0),
          shipping: Number(editForm.shipping || 0),
          paidAmount: Number(editForm.paidAmount || 0),
          note: editForm.note,
          terms: editForm.terms,
          documentBody: editForm.documentBody,
          hasSignature: editForm.hasSignature !== undefined ? editForm.hasSignature === "true" : Boolean(editing.hasSignature),
          items: editItems.map((it) => ({
            productId: it.productId,
            name: it.name,
            sku: it.sku,
            unit: it.unit || "Pcs",
            description: it.description,
            imageUrl: it.imageUrl || "",
            qty: it.qty,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxPercent: it.taxPercent,
          })),
        }),
      });
      if (!res.ok) throw new Error("update_failed");
      setEditing(null);
      await load(page);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-line pb-2">
        <h1 className="gp-display shrink-0 text-2xl font-bold tracking-tight text-[var(--gp-ink)]">
          {t("nav.listQuotations")}
        </h1>
        <DateRangeExcelBar
            onExport={async (from, to) => {
              const res = await fetch(`/api/exports/quotations?from=${from}&to=${to}`);
              await downloadExcelResponse(res, `quotations_${from}_to_${to}.xlsx`);
            }}
          />
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void load(1); }}>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="gp-input gp-input-icon-left"
              value={q}
              onChange={(e) => {
                const value = e.target.value;
                setQ(value);
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(() => void load(1, value), 250);
              }}
              placeholder={t("common.search")}
            />
          </div>
          <Link href="/pos" className="gp-btn gp-btn-primary">
            {t("nav.addQuotation")}
          </Link>
        </form>
      </div>

      <div className="gp-table-wrap !overflow-x-auto lg:-ml-12 lg:w-[calc(100%+3rem)]">
        {data.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table gp-table-compact w-full min-w-[720px] table-fixed [&_td]:py-2 [&_th]:py-2">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[11%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr>
                <th>SL No</th>
                <th>{t("common.date")}</th>
                <th>{t("sales.quotationNo")}</th>
                <th>{t("sales.referenceNo")}</th>
                <th>{t("sales.customer")}</th>
                <th>{t("common.grandTotal")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, index) => (
                <tr key={s._id}>
                  <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="whitespace-nowrap">{formatDateBD(s.saleDate, locale)}</td>
                  <td>
                    <Link href={`/sales/${s._id}/quotation`} className="font-semibold text-primary hover:underline">
                      {s.quotationNo || s.invoiceNo || "—"}
                    </Link>
                  </td>
                  <td className="font-mono text-sm">{s.referenceNo || "—"}</td>
                  <td>
                    {s.customerId ? (
                      <Link
                        href={`/contacts/${s.customerId}/statement`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {s.customerName}
                      </Link>
                    ) : (
                      s.customerName
                    )}
                  </td>
                  <td className="whitespace-nowrap font-bold">{formatBDT(s.grandTotal, locale)}</td>
                  <td>
                    <div className="flex flex-nowrap items-center gap-1">
                      <button type="button" className="gp-btn gp-btn-ghost min-h-8 shrink-0 px-2 text-xs" onClick={() => void openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">{t("common.edit")}</span>
                      </button>
                      <InvoiceActions saleId={s._id} saleStatus={s.status} inline iconOnlyCore className="flex-nowrap [&>*]:shrink-0" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="gp-btn gp-btn-ghost min-h-8 min-w-8 px-2 text-sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            ‹
          </button>
          {pages.map((n) => (
            <button
              key={n}
              type="button"
              className={`gp-btn min-h-8 min-w-8 px-2 text-sm ${
                n === page ? "gp-btn-primary" : "gp-btn-ghost"
              }`}
              onClick={() => void load(n)}
            >
              {n}
            </button>
          ))}
          {page < totalPages ? (
            <button
              type="button"
              className="gp-btn gp-btn-ghost min-h-8 px-3 text-sm"
              onClick={() => void load(page + 1)}
            >
              {t("pos.next")}
            </button>
          ) : null}
          <button
            type="button"
            className="gp-btn gp-btn-ghost min-h-8 min-w-8 px-2 text-sm"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            ›
          </button>
        </div>
      ) : null}

      <Modal open={!!editing} title={t("common.edit")} onClose={() => setEditing(null)} wide>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["quotationNo", t("sales.quotationNo"), "text"],
            ["referenceNo", t("sales.referenceNo"), "text"],
            ["saleDate", t("common.date"), "date"],
            ["customerName", t("sales.customer"), "text"],
            ["customerMobile", t("contacts.mobile"), "text"],
            ["customerAddress", t("contacts.address"), "text"],
            ["customerEmail", t("contacts.email"), "email"],
            ["pfNo", "Quotation / PI No", "text"],
            ["challanNo", "Challan No", "text"],
            ["binNo", "BIN No", "text"],
            ["subject", "Subject", "text"],
            ["discount", t("common.discount"), "number"],
            ["tax", t("common.tax"), "number"],
            ["shipping", "Shipping", "number"],
            ["paidAmount", "Paid Amount", "number"],
          ].map(([key, label, type]) => (
            <Field key={key} label={label}>
              <input
                className="gp-input"
                type={type}
                step={type === "number" ? "0.01" : undefined}
                value={editForm[key] || ""}
                onChange={(e) => setEditForm((form) => ({ ...form, [key]: e.target.value }))}
              />
            </Field>
          ))}
          <Field label="Subtotal">
            <input className="gp-input bg-slate-50" readOnly value={formatBDT(calcSubtotal, locale)} />
          </Field>
          <Field label={t("common.grandTotal")}>
            <input className="gp-input bg-slate-50" readOnly value={formatBDT(calcGrand, locale)} />
          </Field>
          <Field label={t("common.due")}>
            <input className="gp-input bg-slate-50" readOnly value={formatBDT(calcDue, locale)} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.8rem] font-semibold text-muted">Line items</p>
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-8 px-2 text-xs"
                onClick={() =>
                  setEditItems((rows) => [
                    ...rows,
                    { name: "", sku: "", description: "", qty: 1, unitPrice: 0, discount: 0, taxPercent: 0 },
                  ])
                }
              >
                Add item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="gp-table gp-table-compact w-full min-w-[720px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Tax %</th>
                    <th>Line Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((it, idx) => {
                    const lineTotal = Math.max(0, it.qty * it.unitPrice - it.discount);
                    const taxed = lineTotal + (lineTotal * Number(it.taxPercent || 0)) / 100;
                    return (
                      <tr key={idx}>
                        <td>
                          <input className="gp-input min-w-28" value={it.name} onChange={(e) => updateEditItem(idx, { name: e.target.value })} />
                        </td>
                        <td>
                          <input className="gp-input min-w-20" value={it.sku} onChange={(e) => updateEditItem(idx, { sku: e.target.value })} />
                        </td>
                        <td>
                          <input className="gp-input min-w-36" value={it.description} onChange={(e) => updateEditItem(idx, { description: e.target.value })} />
                        </td>
                        <td>
                          <input type="number" min={0} step="0.01" className="gp-input w-20" value={it.qty} onChange={(e) => updateEditItem(idx, { qty: Number(e.target.value) })} />
                        </td>
                        <td>
                          <input type="number" min={0} step="0.01" className="gp-input w-24" value={it.unitPrice} onChange={(e) => updateEditItem(idx, { unitPrice: Number(e.target.value) })} />
                        </td>
                        <td>
                          <input type="number" min={0} step="0.01" className="gp-input w-20" value={it.discount} onChange={(e) => updateEditItem(idx, { discount: Number(e.target.value) })} />
                        </td>
                        <td>
                          <input type="number" min={0} step="0.01" className="gp-input w-16" value={it.taxPercent} onChange={(e) => updateEditItem(idx, { taxPercent: Number(e.target.value) })} />
                        </td>
                        <td className="whitespace-nowrap font-semibold">{formatBDT(taxed, locale)}</td>
                        <td>
                          <button type="button" className="gp-btn gp-btn-ghost px-2 text-xs" onClick={() => setEditItems((rows) => rows.filter((_, i) => i !== idx))}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[0.8rem] font-semibold text-muted">{t("common.note")}</span>
            <textarea className="gp-input min-h-20 resize-y" value={editForm.note || ""} onChange={(e) => setEditForm((form) => ({ ...form, note: e.target.value }))} />
          </label>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[0.8rem] font-semibold text-muted">Terms &amp; Conditions</span>
            <textarea className="gp-input min-h-20 resize-y" value={editForm.terms || ""} onChange={(e) => setEditForm((form) => ({ ...form, terms: e.target.value }))} />
          </label>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[0.8rem] font-semibold text-muted">Quotation Description</span>
            <textarea className="gp-input min-h-20 resize-y" value={editForm.documentBody || ""} onChange={(e) => setEditForm((form) => ({ ...form, documentBody: e.target.value }))} />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setEditing(null)}>{t("common.cancel")}</button>
            <button type="button" className="gp-btn gp-btn-primary" disabled={saving} onClick={() => void saveEdit()}>{saving ? "..." : t("common.save")}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
