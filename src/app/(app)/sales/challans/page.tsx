"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Search } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { formatDateBD } from "@/lib/utils";

type ChallanRow = {
  _id: string;
  shipmentNo?: string;
  saleId?: string;
  customerName?: string;
  referenceNo?: string;
  invoiceNo?: string;
  status?: string;
  shippedDate?: string;
};

export default function ChallanListPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [rows, setRows] = useState<ChallanRow[]>([]);
  const [q, setQ] = useState("");
  const [loadError, setLoadError] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/modules/shipments?limit=200");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.data)) {
        setLoadError(true);
        setRows([]);
        return;
      }
      setLoadError(false);
      setRows(json.data);
    } catch {
      setLoadError(true);
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.shipmentNo, row.customerName, row.referenceNo, row.invoiceNo, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [q, rows]);

  return (
    <div>
      <div className="mb-2 flex flex-col gap-2 border-b border-line pb-2 sm:flex-row sm:items-center">
        <h1 className="gp-display text-2xl font-bold tracking-tight text-[var(--gp-ink)]">
          {locale === "bn" ? "সব চালান" : "All Challan"}
        </h1>
        <div className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="gp-input gp-input-icon-left"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
          />
        </div>
      </div>

      <div className="gp-table-wrap !overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState message={loadError ? t("common.error") : t("common.noData")} />
        ) : (
          <table className="gp-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th>{locale === "bn" ? "চালান নং" : "Challan No"}</th>
                <th>{t("common.date")}</th>
                <th>{t("sales.customer")}</th>
                <th>{t("sales.referenceNo")}</th>
                <th>{t("sales.invoiceNo")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const viewHref = row.saleId ? `/sales/${row.saleId}/challan` : "";
                return (
                  <tr key={row._id}>
                    <td className="font-semibold">
                      {viewHref ? (
                        <Link href={viewHref} className="text-primary hover:underline">
                          {row.shipmentNo || "—"}
                        </Link>
                      ) : (
                        row.shipmentNo || "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {row.shippedDate ? formatDateBD(row.shippedDate, locale) : "—"}
                    </td>
                    <td>{row.customerName || "—"}</td>
                    <td className="break-words font-mono text-sm">{row.referenceNo || "—"}</td>
                    <td>{row.invoiceNo || "—"}</td>
                    <td>
                      <span className="gp-badge gp-badge-success capitalize">{row.status || "—"}</span>
                    </td>
                    <td>
                      {viewHref ? (
                        <Link
                          href={viewHref}
                          className="gp-btn gp-btn-ghost inline-flex h-8 w-8 items-center justify-center p-0"
                          title={locale === "bn" ? "চালান দেখুন" : "View Delivery Challan"}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
