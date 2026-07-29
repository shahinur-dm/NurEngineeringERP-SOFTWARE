"use client";

import Link from "next/link";
import { Eye, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function InvoiceActions({
  saleId,
  compact,
  showPrint,
  className,
}: {
  saleId: string;
  compact?: boolean;
  showPrint?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const pdfHref = `/api/sales/${saleId}/invoice?format=pdf&locale=${locale}`;
  const excelHref = `/api/sales/${saleId}/invoice?format=excel&locale=${locale}`;
  const viewHref = `/sales/${saleId}/invoice`;

  const btn = compact
    ? "gp-btn gp-btn-ghost min-h-9 px-2.5 text-sm"
    : "gp-btn gp-btn-ghost min-h-10 px-3 text-sm";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Link href={viewHref} className={btn} title={t("invoice.show")}>
        <Eye className="h-4 w-4" />
        {!compact ? <span>{t("invoice.show")}</span> : null}
      </Link>
      <a href={pdfHref} target="_blank" rel="noreferrer" className={btn} title={t("invoice.printPdf")}>
        <FileText className="h-4 w-4 text-[var(--gp-danger)]" />
        {!compact ? <span>{t("common.exportPdf")}</span> : null}
      </a>
      <a href={excelHref} target="_blank" rel="noreferrer" className={btn} title={t("invoice.exportExcel")}>
        <FileSpreadsheet className="h-4 w-4 text-[var(--gp-primary)]" />
        {!compact ? <span>{t("common.exportExcel")}</span> : null}
      </a>
      {showPrint ? (
        <button type="button" className={btn} onClick={() => window.print()} title={t("common.print")}>
          <Printer className="h-4 w-4" />
          {!compact ? <span>{t("common.print")}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
