"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Building2 } from "lucide-react";
import { InvoiceActions } from "@/components/InvoiceActions";
import { EmptyState } from "@/components/ui";
import { amountInWords, formatBDT, formatDateBD } from "@/lib/utils";

type SaleItem = {
  name?: string;
  sku?: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
};

type SaleDoc = {
  _id: string;
  invoiceNo: string;
  status: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  payments?: { method: string; amount: number }[];
  note?: string;
  soldByName?: string;
  saleDate: string;
};

type BusinessDoc = {
  name?: string;
  nameBn?: string;
  address?: string;
  addressBn?: string;
  phone?: string;
  email?: string;
  bin?: string;
  tin?: string;
  mushak?: string;
};

export default function InvoiceViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations();
  const locale = useLocale();
  const [sale, setSale] = useState<SaleDoc | null>(null);
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/sales/${id}`);
        if (!res.ok) {
          setError(t("common.noData"));
          return;
        }
        const json = await res.json();
        setSale(json.data);
        setBusiness(json.business);
        setLocationName(json.location?.name || "");
      } catch {
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id, t]);

  if (loading) {
    return <p className="p-8 text-center text-muted">{t("common.loading")}</p>;
  }

  if (error || !sale) {
    return (
      <div className="space-y-4">
        <Link href="/sales" className="gp-btn gp-btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <EmptyState message={error || t("common.noData")} />
      </div>
    );
  }

  const bizName =
    locale === "bn" && business?.nameBn ? business.nameBn : business?.name || "DIT POS";
  const bizAddress =
    locale === "bn" && business?.addressBn ? business.addressBn : business?.address || "";

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales" className="gp-btn gp-btn-ghost min-h-10 px-3">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <div>
            <h1 className="gp-display text-2xl font-bold">{t("invoice.title")}</h1>
            <p className="text-sm text-muted">{sale.invoiceNo}</p>
          </div>
        </div>
        <InvoiceActions saleId={sale._id} showPrint />
      </div>

      <article className="invoice-sheet mx-auto max-w-4xl overflow-hidden rounded-2xl border border-line bg-white shadow-md print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="bg-[var(--gp-primary)] px-6 py-5 text-white md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="gp-display text-2xl font-bold leading-tight md:text-3xl">{bizName}</p>
                <p className="mt-1 text-sm text-white/85">{bizAddress}</p>
                <p className="mt-1 text-sm text-white/75">
                  {business?.phone ? `${business.phone}` : ""}
                  {business?.email ? ` · ${business.email}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                {t("invoice.taxInvoice")}
              </p>
              <p className="mt-1 text-xl font-bold">{sale.invoiceNo}</p>
              <p className="mt-1 text-sm text-white/85">{formatDateBD(sale.saleDate, locale)}</p>
              <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold capitalize">
                {sale.status}
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-4 border-b border-line bg-[var(--gp-bg)] px-6 py-5 md:grid-cols-2 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              {t("invoice.billTo")}
            </p>
            <p className="mt-1 text-lg font-bold">{sale.customerName || "—"}</p>
            {sale.customerMobile ? (
              <p className="text-sm text-muted">
                {t("invoice.mobile")}: {sale.customerMobile}
              </p>
            ) : null}
            {sale.customerAddress ? (
              <p className="text-sm text-muted">{sale.customerAddress}</p>
            ) : null}
          </div>
          <div className="md:text-right">
            <div className="inline-grid gap-1 text-sm md:justify-items-end">
              <p>
                <span className="text-muted">{t("invoice.bin")}: </span>
                <span className="font-semibold">{business?.bin || "—"}</span>
              </p>
              <p>
                <span className="text-muted">{t("invoice.tin")}: </span>
                <span className="font-semibold">{business?.tin || "—"}</span>
              </p>
              <p>
                <span className="text-muted">{t("invoice.mushak")}: </span>
                <span className="font-semibold">{business?.mushak || "—"}</span>
              </p>
              {locationName ? (
                <p>
                  <span className="text-muted">{t("dashboard.location")}: </span>
                  <span className="font-semibold">{locationName}</span>
                </p>
              ) : null}
              {sale.soldByName ? (
                <p>
                  <span className="text-muted">{t("invoice.soldBy")}: </span>
                  <span className="font-semibold">{sale.soldByName}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-2 py-4 md:px-4">
          <table className="gp-table">
            <thead>
              <tr>
                <th className="w-14">{t("invoice.sl")}</th>
                <th>{t("invoice.description")}</th>
                <th>SKU</th>
                <th>{t("invoice.qty")}</th>
                <th>{t("invoice.rate")}</th>
                <th>{t("common.discount")}</th>
                <th className="text-right">{t("invoice.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="font-semibold">{item.name}</td>
                  <td className="text-muted">{item.sku || "—"}</td>
                  <td>
                    {item.qty}
                    {item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td>{formatBDT(item.unitPrice, locale)}</td>
                  <td>{formatBDT(item.discount || 0, locale)}</td>
                  <td className="text-right font-bold">{formatBDT(item.lineTotal, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 border-t border-line px-6 py-6 md:grid-cols-2 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              {t("invoice.inWords")}
            </p>
            <p className="mt-2 rounded-xl border border-line bg-[#fbfcfb] px-4 py-3 text-sm font-semibold leading-relaxed">
              {amountInWords(sale.grandTotal, locale === "en" ? "en" : "bn")}
            </p>
            {sale.note ? (
              <p className="mt-4 text-sm text-muted">
                <span className="font-semibold">{t("common.note")}: </span>
                {sale.note}
              </p>
            ) : null}
            {sale.payments?.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {t("sales.paymentMethod")}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {sale.payments.map((p, i) => (
                    <li key={i} className="flex justify-between gap-4 border-b border-line py-1.5">
                      <span className="capitalize">{p.method}</span>
                      <span className="font-semibold">{formatBDT(p.amount, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-line bg-[var(--gp-bg)] p-4">
            <SummaryRow label={t("common.subtotal")} value={formatBDT(sale.subtotal, locale)} />
            <SummaryRow label={t("common.discount")} value={formatBDT(sale.discount, locale)} />
            <SummaryRow label={t("common.tax")} value={formatBDT(sale.tax, locale)} />
            <SummaryRow label={t("invoice.shipping")} value={formatBDT(sale.shipping, locale)} />
            <SummaryRow
              label={t("common.grandTotal")}
              value={formatBDT(sale.grandTotal, locale)}
              strong
            />
            <SummaryRow label={t("common.paid")} value={formatBDT(sale.paidAmount, locale)} />
            <SummaryRow label={t("common.due")} value={formatBDT(sale.dueAmount, locale)} highlight />
          </div>
        </div>

        <div className="grid gap-10 border-t border-line px-6 py-10 md:grid-cols-2 md:px-8">
          <div>
            <div className="mb-10 border-b border-line" />
            <p className="text-sm font-semibold text-muted">{t("invoice.received")}</p>
          </div>
          <div>
            <div className="mb-10 border-b border-line" />
            <p className="text-sm font-semibold text-muted">{t("invoice.authorized")}</p>
          </div>
        </div>

        <footer className="border-t border-line bg-[var(--gp-bg)] px-6 py-4 text-center text-sm text-muted md:px-8">
          {t("invoice.thanks")} · {t("invoice.computerGenerated")}
        </footer>
      </article>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-line/80 py-2 text-sm last:border-0 ${
        strong ? "font-bold text-[var(--gp-ink)]" : ""
      } ${highlight ? "text-[var(--gp-warn)]" : ""}`}
    >
      <span>{label}</span>
      <span className={strong ? "text-lg" : "font-semibold"}>{value}</span>
    </div>
  );
}
