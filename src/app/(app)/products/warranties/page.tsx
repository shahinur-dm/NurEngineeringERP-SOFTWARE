"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, Field, PageHeader, TableSkeleton } from "@/components/ui";
import { useDebouncedValue } from "@/lib/hooks";

type Product = {
  _id: string;
  name: string;
  nameBn?: string;
  sku: string;
  brand?: string;
};

export default function WarrantiesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: "100" });
    if (debouncedQ) qs.set("q", debouncedQ);
    const res = await fetch(`/api/products?${qs}`);
    const json = await res.json();
    setRows(json.data || []);
    setLoading(false);
  }, [debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title={locale === "bn" ? "ওয়ারেন্টি" : "Warranties"}
        subtitle={
          locale === "bn"
            ? "পণ্য অনুযায়ী ওয়ারেন্টি মাস ট্র্যাক করুন (লোকাল নোট)"
            : "Track warranty months per product (local note)"
        }
      />
      <div className="gp-card mb-4 p-3.5">
        <Field label={t("common.search")}>
          <input className="gp-input" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
      </div>
      {loading && !rows.length ? (
        <TableSkeleton rows={6} cols={4} />
      ) : rows.length === 0 ? (
        <EmptyState message={t("common.noData")} />
      ) : (
        <div className="gp-table-wrap overflow-x-auto">
          <table className="gp-table">
            <thead>
              <tr>
                <th>{t("products.name")}</th>
                <th>{t("products.sku")}</th>
                <th>{t("products.brand")}</th>
                <th>{locale === "bn" ? "ওয়ারেন্টি (মাস)" : "Warranty (months)"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p._id}>
                  <td className="font-semibold">
                    {locale === "bn" && p.nameBn ? p.nameBn : p.name}
                  </td>
                  <td>{p.sku}</td>
                  <td>{p.brand || "—"}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="gp-input"
                      value={months[p._id] ?? "12"}
                      onChange={(e) => setMonths((m) => ({ ...m, [p._id]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
