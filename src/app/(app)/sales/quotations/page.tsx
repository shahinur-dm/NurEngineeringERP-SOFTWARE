"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, Field, FilterBar, PageHeader } from "@/components/ui";
import { InvoiceActions } from "@/components/InvoiceActions";
import { formatBDT, formatDateBD } from "@/lib/utils";

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
  const [q, setQ] = useState("");

  async function load() {
    const qs = new URLSearchParams({ limit: "100", status: "quotation" });
    if (q) qs.set("q", q);
    const res = await fetch(`/api/sales?${qs}`);
    const json = await res.json();
    setData(json.data || []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <button type="button" className="gp-btn gp-btn-primary mb-5" onClick={() => void load()}>
        {t("dashboard.apply")}
      </button>

      <div className="gp-table-wrap !overflow-x-auto">
        {data.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table">
            <thead>
              <tr>
                <th>{t("sales.quotationNo")}</th>
                <th>{t("sales.referenceNo")}</th>
                <th>{t("sales.customer")}</th>
                <th>{t("common.date")}</th>
                <th>{t("common.grandTotal")}</th>
                <th className="min-w-[14rem]">{t("common.actions")}</th>
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
                  <td className="min-w-[14rem] align-top">
                    <InvoiceActions saleId={s._id} saleStatus={s.status} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
