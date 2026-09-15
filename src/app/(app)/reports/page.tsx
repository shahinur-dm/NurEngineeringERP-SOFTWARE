"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import { BarChart3 } from "lucide-react";

const REPORT_LINKS = [
  { href: "/reports/profit-loss", key: "profitLoss" },
  { href: "/reports/purchase-sell", key: "purchaseSell" },
  { href: "/reports/tax", key: "tax" },
  { href: "/reports/customer-supplier", key: "customerSupplier" },
  { href: "/reports/customer-groups", key: "customerGroups" },
  { href: "/reports/stock", key: "stock" },
  { href: "/reports/stock-adjustment", key: "stockAdjustment" },
  { href: "/reports/trending", key: "trending" },
  { href: "/reports/items", key: "items" },
  { href: "/reports/product-purchase", key: "productPurchase" },
  { href: "/reports/product-sell", key: "productSell" },
  { href: "/reports/purchase-payment", key: "purchasePayment" },
  { href: "/reports/sell-payment", key: "sellPayment" },
  { href: "/reports/expense", key: "expense" },
  { href: "/reports/register", key: "register" },
  { href: "/reports/sales-rep", key: "salesRep" },
  { href: "/reports/activity-log", key: "activityLog" },
] as const;

const TILE_TONES = [
  "bg-[#eff6ff] text-[#2563eb]",
  "bg-[#ecfdf5] text-[#059669]",
  "bg-[#f5f3ff] text-[#7c3aed]",
  "bg-[#fff7ed] text-[#ea580c]",
  "bg-[#fdf2f8] text-[#db2777]",
  "bg-[#ecfeff] text-[#0891b2]",
] as const;

export default function ReportsPage() {
  const t = useTranslations();

  return (
    <div className="reports-premium">
      <PageHeader title={t("reports.title")} subtitle={t("reports.drillHint")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_LINKS.map((r, i) => (
          <Link key={r.key} href={r.href} className="report-tile">
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${TILE_TONES[i % TILE_TONES.length]}`}>
              <BarChart3 className="h-6 w-6" />
            </span>
            <p className="mt-4 text-xl font-extrabold tracking-tight">{t(`reports.${r.key}`)}</p>
            <p className="mt-2 text-sm text-muted">{t("dashboard.clickBreakdown")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
