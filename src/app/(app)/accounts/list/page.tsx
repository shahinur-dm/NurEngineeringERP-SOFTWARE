"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatBDT } from "@/lib/utils";

type Acc = { key: string; name: string; nameBn: string; balance: number };

export default function AccountListPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [rows, setRows] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/summary");
      const json = await res.json();
      setRows(json.data?.accounts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title={locale === "bn" ? "অ্যাকাউন্ট তালিকা" : "Account List"}
        subtitle={locale === "bn" ? "ক্রয়/বিক্রয় থেকে গণনা করা হিসাব" : "Computed from posted purchases and sales"}
      />
      {loading ? (
        <EmptyState message={t("app.loading")} />
      ) : (
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>{locale === "bn" ? "হিসাব" : "Account"}</th>
                <th className="text-right">{locale === "bn" ? "ব্যালেন্স" : "Balance"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="font-semibold">{locale === "bn" ? r.nameBn : r.name}</td>
                  <td className="gp-money text-right">{formatBDT(r.balance, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
