"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileCheck, FileText, Printer, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { paymentStatusBadgeClass, paymentStatusFromAmounts } from "@/lib/sale-finance";
import { useState } from "react";

export function PaymentStatusBadge({
  grandTotal,
  paidAmount,
}: {
  grandTotal: number;
  paidAmount: number;
}) {
  const t = useTranslations();
  const status = paymentStatusFromAmounts(grandTotal, paidAmount);
  const label =
    status === "paid"
      ? t("sales.paymentPaid")
      : status === "partial"
        ? t("sales.paymentPartial")
        : t("sales.paymentDue");
  return <span className={cn(paymentStatusBadgeClass(status), "capitalize")}>{label}</span>;
}

export function DocumentExportBar({
  printBase,
  pdfHref,
}: {
  printBase: string;
  pdfHref: string;
}) {
  function withQuery(url: string, extra: string) {
    return url.includes("?") ? `${url}&${extra}` : `${url}?${extra}`;
  }
  const btn = "gp-btn gp-btn-ghost min-h-10 px-3 text-sm";
  return (
    <>
      <Link href={withQuery(printBase, "print=1")} className={btn}>
        Print with Header & Footer
      </Link>
      <Link href={withQuery(printBase, "print=1&hf=0")} className={btn}>
        Print without Header & Footer
      </Link>
      <a href={pdfHref} target="_blank" rel="noreferrer" className={btn}>
        PDF with Header & Footer
      </a>
      <a href={withQuery(pdfHref, "hf=0")} target="_blank" rel="noreferrer" className={btn}>
        PDF without Header & Footer
      </a>
    </>
  );
}

export function InvoiceActions({
  saleId,
  compact,
  inline,
  showPrint,
  hidePrintPdf,
  saleStatus,
  className,
}: {
  saleId: string;
  compact?: boolean;
  inline?: boolean;
  showPrint?: boolean;
  hidePrintPdf?: boolean;
  saleStatus?: string;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const pdfHref = `/api/sales/${saleId}/invoice?format=pdf&locale=en`;
  const viewHref = `/sales/${saleId}/invoice`;
  const quotationHref = `/sales/${saleId}/quotation`;
  const quotationPdf = `/api/sales/${saleId}/quotation?format=pdf`;
  const challanView = `/sales/${saleId}/challan`;
  const challanPdf = `/api/sales/${saleId}/challan?format=pdf&locale=en`;
  const isQuotation = saleStatus === "quotation";
  const stacked = compact && !inline;

  const btn = stacked
    ? "gp-btn gp-btn-ghost min-h-9 w-full justify-start whitespace-nowrap px-2.5 text-sm"
    : inline
      ? "gp-btn gp-btn-ghost min-h-8 px-2 text-xs whitespace-nowrap"
      : "gp-btn gp-btn-ghost min-h-10 px-3 text-sm whitespace-nowrap";

  async function convert() {
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${saleId}/finalize`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) router.push(`/sales/${json.data?._id || saleId}/invoice`);
    } finally {
      setBusy(false);
    }
  }

  const printQuotationHref = `${quotationHref}?print=1`;

  const printInvoiceHref = `${viewHref}?print=1`;
  const printChallanHref = `${challanView}?print=1`;

  return (
    <div
      className={cn(
        stacked
          ? "flex min-w-[13rem] flex-col items-stretch gap-1"
          : "flex flex-wrap items-center gap-1.5",
        inline && "gap-1",
        className,
      )}
    >
      {isQuotation ? (
        <>
          <Link href={quotationHref} className={btn} title="View">
            <Eye className="h-4 w-4" />
            <span>View</span>
          </Link>
          {hidePrintPdf ? null : showPrint ? (
            <button type="button" className={btn} onClick={() => window.print()} title="Print">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          ) : (
            <Link href={printQuotationHref} className={btn} title="Print">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Link>
          )}
          {hidePrintPdf ? null : (
          <a href={quotationPdf} target="_blank" rel="noreferrer" className={btn} title="PDF">
            <FileText className="h-4 w-4 text-[var(--gp-info)]" />
            <span>PDF</span>
          </a>
          )}
          <button
            type="button"
            className={cn(
              inline
                ? "gp-btn gp-btn-primary min-h-8 px-2 text-xs whitespace-nowrap"
                : "gp-btn gp-btn-primary min-h-9 px-2.5 text-sm",
              stacked && "w-full justify-start",
            )}
            disabled={busy}
            onClick={() => void convert()}
            title={t("sales.convertToOrder")}
          >
            <FileCheck className="h-4 w-4" />
            <span>{t("sales.convertToOrder")}</span>
          </button>
        </>
      ) : (
        <>
          <Link href={viewHref} className={btn} title="View Invoice">
            <Eye className="h-4 w-4" />
            <span>View Invoice</span>
          </Link>
          {hidePrintPdf ? null : showPrint ? (
            <button type="button" className={btn} onClick={() => window.print()} title="Print">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          ) : (
            <Link href={printInvoiceHref} className={btn} title="Print">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Link>
          )}
          {hidePrintPdf ? null : (
          <a href={pdfHref} target="_blank" rel="noreferrer" className={btn} title="Invoice PDF">
            <FileText className="h-4 w-4 text-[var(--gp-danger)]" />
            <span>Invoice PDF</span>
          </a>
          )}
          <Link href={challanView} className={btn} title="View Delivery Challan">
            <Truck className="h-4 w-4" />
            <span>View Delivery Challan</span>
          </Link>
          <Link href={printChallanHref} className={btn} title="Print Delivery Challan">
            <Printer className="h-4 w-4" />
            <span>Print Delivery Challan</span>
          </Link>
          <a href={challanPdf} target="_blank" rel="noreferrer" className={btn} title="Delivery Challan PDF">
            <FileText className="h-4 w-4" />
            <span>Delivery Challan PDF</span>
          </a>
        </>
      )}
    </div>
  );
}
