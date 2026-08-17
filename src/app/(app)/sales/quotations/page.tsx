"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, Field, FilterBar, PageHeader } from "@/components/ui";
import { InvoiceActions } from "@/components/InvoiceActions";
import { formatBDT, formatDateBD } from "@/lib/utils";

const PAGE_SIZE = 20;

type Quote = {
  _id: string;
  quotationNo?: string;
  referenceNo?: string;
  invoiceNo?: string;
  customerName: string;
  customerId?: string;
  grandTotal: number;
  saleDate: string;
  status: string;
};

export default function QuotationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [data, setData] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  async function load(nextPage = 1) {
    const qs = new URLSearchParams({
      limit: String(PAGE_SIZE),
      page: String(nextPage),
      status: "quotation",
    });
    if (q) qs.set("q", q);
    const res = await fetch(`/api/sales?${qs}`);
    const json = await res.json();
    setData(json.data || []);
    setTotal(Number(json.total) || 0);
    setPage(nextPage);
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader
        title={t("nav.listQuotations")}
        actions={
          <Link href="/pos" className="gp-btn gp-btn-primary">
            {t("nav.addQuotation")}
          </Link>
        }
      />

      <FilterBar>
        <Field label={t("common.search")}>
          <input className="gp-input" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
      </FilterBar>
      <button type="button" className="gp-btn gp-btn-primary mb-5" onClick={() => void load(1)}>
        {t("dashboard.apply")}
      </button>

      <div className="gp-table-wrap !overflow-x-auto">
        {data.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table gp-table-compact">
            <thead>
              <tr>
                <th>{t("sales.quotationNo")}</th>
                <th>{t("sales.referenceNo")}</th>
                <th>{t("sales.customer")}</th>
                <th>{t("common.date")}</th>
                <th>{t("common.grandTotal")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s._id}>
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
                  <td>{formatDateBD(s.saleDate, locale)}</td>
                  <td className="font-bold">{formatBDT(s.grandTotal, locale)}</td>
                  <td>
                    <InvoiceActions saleId={s._id} saleStatus={s.status} inline />
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
    </div>
  );
}
