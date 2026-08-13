"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileCheck } from "lucide-react";
import { InvoiceActions } from "@/components/InvoiceActions";
import { NesTradeDocument } from "@/components/NesTradeDocument";
import { EmptyState } from "@/components/ui";

type SaleDoc = {
  _id: string;
  invoiceNo?: string;
  quotationNo?: string;
  salesOrderNo?: string;
  referenceNo?: string;
  poNo?: string;
  poDate?: string;
  subject?: string;
  terms?: string;
  status: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  items: {
    name?: string;
    sku?: string;
    unit?: string;
    description?: string;
    imageUrl?: string;
    qty: number;
    unitPrice: number;
    discount?: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  note?: string;
  soldByName?: string;
  saleDate: string;
};

type BusinessDoc = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
};

export default function QuotationViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const t = useTranslations();
  const [sale, setSale] = useState<SaleDoc | null>(null);
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sales/${id}`);
      if (!res.ok) {
        setError(t("common.noData"));
        return;
      }
      const json = await res.json();
      setSale(json.data);
      setBusiness(json.business);
      setLocationName(json.location?.name || "");
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  useEffect(() => {
    if (loading || !sale) return;
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [loading, sale]);

  async function convertToOrder() {
    if (!sale) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${sale._id}/finalize`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "fail");
      router.push(`/sales/${sale._id}/invoice`);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-center text-muted">{t("common.loading")}</p>;
  }

  if (error || !sale) {
    return (
      <div className="space-y-4">
        <Link href="/sales/quotations" className="gp-btn gp-btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <EmptyState message={error || t("common.noData")} />
      </div>
    );
  }

  const pdfHref = `/api/sales/${sale._id}/quotation?format=pdf`;

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales/quotations" className="gp-btn gp-btn-ghost min-h-10 px-3">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <div>
            <h1 className="gp-display text-2xl font-bold">{t("nav.listQuotations")}</h1>
            <p className="text-sm text-muted">
              {sale.quotationNo || "—"}
              {sale.referenceNo ? ` · ${sale.referenceNo}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <InvoiceActions saleId={sale._id} saleStatus={sale.status} showPrint />
          <a href={pdfHref} target="_blank" rel="noreferrer" className="gp-btn gp-btn-ghost min-h-10 px-3">
            {t("common.exportPdf")}
          </a>
          {sale.status === "quotation" ? (
            <button
              type="button"
              className="gp-btn gp-btn-primary"
              disabled={busy}
              onClick={() => void convertToOrder()}
            >
              <FileCheck className="h-4 w-4" />
              {busy ? "..." : t("sales.convertToOrder")}
            </button>
          ) : (
            <Link href={`/sales/${sale._id}/invoice`} className="gp-btn gp-btn-primary">
              {t("invoice.show")}
            </Link>
          )}
        </div>
      </div>

      <NesTradeDocument kind="quotation" sale={sale} business={business} locationName={locationName} />
    </div>
  );
}
