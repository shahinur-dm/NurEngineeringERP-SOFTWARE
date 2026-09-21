"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Row = {
  id: string;
  date: string;
  reference: string;
  type: string;
  party: string;
  description: string;
  amount: number;
  paidReceived: number;
  due: number;
  cashImpact: number;
  bankImpact: number;
};

const TYPE_EN: Record<string, string> = {
  sale: "Sale",
  purchase: "Purchase",
  expense: "Expense",
  customer_payment: "Customer payment",
  supplier_payment: "Supplier payment",
};
const TYPE_BN: Record<string, string> = {
  sale: "বিক্রয়",
  purchase: "ক্রয়",
  expense: "খরচ",
  customer_payment: "গ্রাহক পেমেন্ট",
  supplier_payment: "সরবরাহকারী পেমেন্ট",
};

export default function AccountReportPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/transactions?kind=documents&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setRows(json.data || []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title={locale === "bn" ? "হিসাব রিপোর্ট" : "Account Report"}
        subtitle={
          locale === "bn"
            ? "প্রতিটি ক্রয়/বিক্রয় একবারই দেখায়"
            : "One row per posted purchase, sale or expense"
        }
      />
      <input
        className="gp-input mb-4 max-w-sm"
        placeholder={locale === "bn" ? "খুঁজুন" : "Search"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <EmptyState message={t("app.loading")} />
      ) : rows.length === 0 ? (
        <EmptyState message={t("common.noData")} />
      ) : (
        <div className="gp-table-wrap overflow-x-auto">
          <table className="gp-table">
            <thead>
              <tr>
                <th>{locale === "bn" ? "তারিখ" : "Date"}</th>
                <th>{locale === "bn" ? "রেফারেন্স" : "Reference"}</th>
                <th>{locale === "bn" ? "ধরন" : "Type"}</th>
                <th>{locale === "bn" ? "পক্ষ" : "Customer/Supplier"}</th>
                <th>{locale === "bn" ? "বিবরণ" : "Description"}</th>
                <th className="text-right">{locale === "bn" ? "পরিমাণ" : "Amount"}</th>
                <th className="text-right">{locale === "bn" ? "প্রাপ্ত/প্রদত্ত" : "Paid/Received"}</th>
                <th className="text-right">{locale === "bn" ? "বাকি" : "Due"}</th>
                <th className="text-right">{locale === "bn" ? "নগদ" : "Cash"}</th>
                <th className="text-right">{locale === "bn" ? "ব্যাংক" : "Bank"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateBD(r.date, locale)}</td>
                  <td className="font-semibold">{r.reference}</td>
                  <td>{(locale === "bn" ? TYPE_BN : TYPE_EN)[r.type] || r.type}</td>
                  <td>{r.party || "—"}</td>
                  <td>{r.description}</td>
                  <td className="gp-money text-right">{formatBDT(r.amount, locale)}</td>
                  <td className="gp-money text-right">{formatBDT(r.paidReceived, locale)}</td>
                  <td className="gp-money text-right">{formatBDT(r.due, locale)}</td>
                  <td className="gp-money text-right">{formatBDT(r.cashImpact, locale)}</td>
                  <td className="gp-money text-right">{formatBDT(r.bankImpact, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
