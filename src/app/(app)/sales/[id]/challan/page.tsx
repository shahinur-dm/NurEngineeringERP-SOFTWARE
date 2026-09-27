"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { DocumentExportBar, InvoiceActions } from "@/components/InvoiceActions";
import { NesTradeDocument } from "@/components/NesTradeDocument";
import { EmptyState, Field } from "@/components/ui";

type ChallanItem = {
  name?: string;
  sku?: string;
  unit?: string;
  description?: string;
  imageUrl?: string;
  qty?: number;
};

type ChallanDoc = {
  _id: string;
  shipmentNo: string;
  invoiceNo?: string;
  referenceNo?: string;
  customerName?: string;
  shippingAddress?: string;
  status?: string;
  shippedDate?: string;
  items?: ChallanItem[];
};

type SaleDoc = {
  _id: string;
  invoiceNo?: string;
  quotationNo?: string;
  salesOrderNo?: string;
  referenceNo?: string;
  poNo?: string;
  poDate?: string;
  subject?: string;
  section?: string;
  attention?: string;
  documentBody?: string;
  status?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  saleDate: string;
  soldByName?: string;
  items: ChallanItem[];
};

type BusinessDoc = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
};

export default function DeliveryChallanPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const t = useTranslations();
  const [challan, setChallan] = useState<ChallanDoc | null>(null);
  const [sale, setSale] = useState<SaleDoc | null>(null);
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showChrome, setShowChrome] = useState(true);
  const [quoteLookup, setQuoteLookup] = useState("");
  const [lookupMsg, setLookupMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/sales/${id}/challan?format=json`);
        if (!res.ok) {
          setError(t("common.noData"));
          return;
        }
        const json = await res.json();
        setChallan(json.data);
        setSale(json.sale);
        setBusiness(json.business);
      } catch {
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    }
    if (id) void load();
  }, [id, t]);

  const handlePrint = useCallback((hf: boolean) => {
    setShowChrome(hf);
    setTimeout(() => {
      window.print();
    }, 60);
  }, []);

  async function loadQuotationChallan() {
    const no = quoteLookup.trim().toUpperCase();
    if (!no) return;
    setLookupMsg("");
    try {
      const res = await fetch(`/api/sales?quotationNo=${encodeURIComponent(no)}&status=quotation&limit=1`);
      const json = await res.json();
      const quote = json.data?.[0];
      if (!quote?._id) {
        setLookupMsg("Quotation not found");
        return;
      }
      if (String(quote._id) === String(id)) return;
      router.push(`/sales/${quote._id}/challan`);
    } catch {
      setLookupMsg(t("common.error"));
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hfParam = new URLSearchParams(window.location.search).get("hf");
    if (hfParam === "0") {
      setShowChrome(false);
    }
    const onTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ hf?: boolean }>;
      const hf = customEvent.detail?.hf !== false;
      handlePrint(hf);
    };
    window.addEventListener("nes-print-trigger", onTrigger);
    return () => window.removeEventListener("nes-print-trigger", onTrigger);
  }, [handlePrint]);

  useEffect(() => {
    if (loading || !challan || !sale) return;
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const hfParam = new URLSearchParams(window.location.search).get("hf");
      const hf = hfParam !== "0";
      setShowChrome(hf);
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [loading, challan, sale]);

  if (loading) {
    return <p className="p-8 text-center text-muted">{t("common.loading")}</p>;
  }

  if (error || !challan || !sale) {
    return (
      <div className="space-y-4">
        <Link href="/sales" className="gp-btn gp-btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <EmptyState message={error || t("common.noData")} />
      </div>
    );
  }

  const pdfHref = `/api/sales/${sale._id}/challan?format=pdf&locale=en`;

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/sales/${sale._id}/invoice`} className="gp-btn gp-btn-ghost min-h-10 px-3">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <div>
            <h1 className="gp-display text-2xl font-bold">{t("invoice.deliveryChallan")}</h1>
            <p className="text-sm text-muted">
              {challan.shipmentNo}
              {sale.referenceNo ? ` · ${sale.referenceNo}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <DocumentExportBar printBase={`/sales/${sale._id}/challan`} pdfHref={pdfHref} onPrint={handlePrint} />
          <InvoiceActions saleId={sale._id} saleStatus={sale.status} hidePrintPdf />
        </div>
      </div>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-end gap-2">
        <Field label={t("pos.quotationPiNo")}>
          <input
            className="gp-input"
            value={quoteLookup}
            onChange={(e) => setQuoteLookup(e.target.value.toUpperCase())}
            placeholder="NES202600001"
          />
        </Field>
        <button type="button" className="gp-btn gp-btn-ghost min-h-10 px-3" onClick={() => void loadQuotationChallan()}>
          {t("pos.loadQuotation")}
        </button>
        {lookupMsg ? <p className="text-sm text-muted">{lookupMsg}</p> : null}
      </div>

      <NesTradeDocument kind="challan" sale={sale} business={business} challan={challan} showChrome={showChrome} />
    </div>
  );
}
