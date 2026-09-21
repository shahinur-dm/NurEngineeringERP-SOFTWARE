"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, Landmark, TrendingDown, TrendingUp, Wallet, Users } from "lucide-react";
import { EmptyState, KpiCard, PageHeader } from "@/components/ui";
import { formatBDT } from "@/lib/utils";

type Summary = {
  cashBalance: number;
  bankBalance: number;
  customerDue: number;
  supplierDue: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export default function AccountsDashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [data, setData] = useState<Summary | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts/summary");
      const json = await res.json();
      if (!res.ok) throw new Error("fail");
      setData(json.data);
    } catch {
      setMsg(t("common.error"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return <EmptyState message={msg || t("app.loading")} />;

  const items = [
    { label: locale === "bn" ? "নগদ ব্যালেন্স" : "Cash Balance", value: data.cashBalance, icon: Wallet },
    { label: locale === "bn" ? "ব্যাংক ব্যালেন্স" : "Bank Balance", value: data.bankBalance, icon: Landmark },
    { label: locale === "bn" ? "গ্রাহক পাওনা" : "Customer Due", value: data.customerDue, icon: Users, tone: "warn" as const },
    { label: locale === "bn" ? "সরবরাহকারী দেনা" : "Supplier Due", value: data.supplierDue, icon: Banknote, tone: "danger" as const },
    { label: locale === "bn" ? "মোট আয়" : "Total Income", value: data.totalIncome, icon: TrendingUp, tone: "info" as const },
    { label: locale === "bn" ? "মোট ব্যয়" : "Total Expense", value: data.totalExpense, icon: TrendingDown },
    { label: locale === "bn" ? "নেট ব্যালেন্স" : "Net Balance", value: data.netBalance, icon: Landmark },
  ];

  return (
    <div>
      <PageHeader
        title={locale === "bn" ? "হিসাব" : "Accounts"}
        subtitle={
          locale === "bn"
            ? "ক্রয়, বিক্রয় ও পেমেন্ট থেকে স্বয়ংক্রিয় ব্যালেন্স"
            : "Balances from completed purchases, sales and payments"
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={formatBDT(item.value, locale)}
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </div>
    </div>
  );
}
