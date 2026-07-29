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

export default function ReportsPage() {
  const t = useTranslations();

  return (
    <div>
      <PageHeader title={t("reports.title")} subtitle={t("reports.drillHint")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_LINKS.map((r) => (
          <Link key={r.key} href={r.href} className="gp-card p-6 transition hover:border-primary">
            <BarChart3 className="h-8 w-8 text-primary" />
            <p className="mt-4 text-xl font-bold">{t(`reports.${r.key}`)}</p>
            <p className="mt-2 text-sm text-muted">{t("dashboard.clickBreakdown")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
