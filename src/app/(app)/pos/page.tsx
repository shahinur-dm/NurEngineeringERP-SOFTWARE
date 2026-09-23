"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays, FileText, Grid2X2, ImageIcon, MapPin, PackagePlus, Plus,
  Search, Trash2, Upload, UserPlus, Wallet, X,
} from "lucide-react";
import { Field, Modal } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks";
import { DEFAULT_DOCUMENT_BODY, withQuotationCompanyName } from "@/lib/default-document-body";

type Product = {
  _id: string; name: string; nameBn?: string; sku: string; sellPrice: number;
  unit?: string; locationQty?: number; imageUrl?: string; description?: string;
  brand?: string; categoryId?: string;
};
type Customer = {
  _id: string; name: string; nameBn?: string; mobile?: string; address?: string;
  email?: string; bin?: string;
};
type Named = { _id: string; name: string; nameBn?: string };
type CartItem = Product & {
  qty: number; bonusQty: number; saleDescription: string; lineDiscount: number;
  lineDiscountType?: "percentage" | "fixed";
};

function cartLineDiscount(i: CartItem) {
  const base = i.qty * i.sellPrice;
  const raw = i.lineDiscountType === "percentage"
    ? (base * Math.min(100, Number(i.lineDiscount) || 0)) / 100
    : Number(i.lineDiscount) || 0;
  return Math.min(base, Math.max(0, raw));
}
type PayRow = { id: string; method: string; amount: number };

const PAGE_SIZE = 20;
const METHODS = ["cash", "card", "bank", "bkash", "nagad", "rocket", "cheque", "credit"] as const;
const today = () => new Date().toISOString().slice(0, 10);
const payRow = (): PayRow => ({ id: `${Date.now()}-${Math.random()}`, method: "cash", amount: 0 });

function PosPageInner() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const entryMode = searchParams.get("mode");
  const isChallanEntry = entryMode === "challan";
  const isBillEntry = entryMode === "bill";
  const isReturnEntry = entryMode === "return";
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Named[]>([]);
  const [brands, setBrands] = useState<Named[]>([]);
  const [locationId, setLocationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [attention, setAttention] = useState("");
  const [attentionMenu, setAttentionMenu] = useState(false);
  const [saleDate, setSaleDate] = useState(today);
  const [quotationNo, setQuotationNo] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [sourceQuotationId, setSourceQuotationId] = useState("");
  const [sourceSaleId, setSourceSaleId] = useState("");
  const [challanQuery, setChallanQuery] = useState("");
  const [challanMenu, setChallanMenu] = useState(false);
  type ChallanHit = { _id: string; shipmentNo?: string; saleId?: string; customerName?: string; invoiceNo?: string; referenceNo?: string };
  const [challanHits, setChallanHits] = useState<ChallanHit[]>([]);
  type QuoteHit = { _id: string; quotationNo?: string; pfNo?: string; poNo?: string; customerName?: string; referenceNo?: string };
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteHits, setQuoteHits] = useState<QuoteHit[]>([]);
  const [quoteMenu, setQuoteMenu] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [productResultsOpen, setProductResultsOpen] = useState(false);
  const query = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
  const [documentBody, setDocumentBody] = useState(DEFAULT_DOCUMENT_BODY);
  const [savedTerms, setSavedTerms] = useState<string[]>([]);
  const [savedTermQuery, setSavedTermQuery] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [payRows, setPayRows] = useState<PayRow[]>([payRow()]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [customerMenu, setCustomerMenu] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", mobile: "" });
  const productsRef = useRef<Product[]>([]);
  const quotationNumberPending = useRef(false);
  const referenceNumberPending = useRef(false);
  const reservedQuotationNo = useRef("");

  useEffect(() => { productsRef.current = products; }, [products]);
  useEffect(() => {
    Promise.all([
      fetch("/api/meta").then((r) => r.json()),
      fetch("/api/contacts?type=customer&limit=200").then((r) => r.json()),
      fetch("/api/modules/categories?limit=200").then((r) => r.json()),
      fetch("/api/modules/brands?limit=200").then((r) => r.json()),
      fetch("/api/sales?status=quotation&limit=200").then((r) => r.json()),
    ]).then(([m, c, cat, b, quotations]) => {
      setLocationId(String(m.locations?.[0]?._id || ""));
      setCustomers(c.data || []); setCategories(cat.data || []); setBrands(b.data || []);
      setSavedTerms(
        [...new Set<string>(
          (quotations.data || []).flatMap((quotation: { terms?: string }) =>
            String(quotation.terms || "")
              .split("\n")
              .map((line) => line.replace(/^[-•◆]\s*/, "").trim())
              .filter(Boolean),
          ),
        )],
      );
    }).catch(() => setMessage(t("common.error")));
  }, [t]);

  const loadProducts = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: "200" });
      if (query) qs.set("q", query);
      if (locationId) qs.set("locationId", locationId);
      if (categoryId) qs.set("categoryId", categoryId);
      const json = await fetch(`/api/products?${qs}`).then((r) => r.json());
      setProducts(json.data || []);
    } catch { setProducts([]); } finally { setLoading(false); }
  }, [query, locationId, categoryId]);
  useEffect(() => {
    let active = true;
    const qs = new URLSearchParams({ limit: "200" });
    if (query) qs.set("q", query);
    if (locationId) qs.set("locationId", locationId);
    if (categoryId) qs.set("categoryId", categoryId);
    fetch(`/api/products?${qs}`).then((r) => r.json()).then((json) => {
      if (active) setProducts(json.data || []);
    }).catch(() => {
      if (active) setProducts([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [query, locationId, categoryId]);

  const filtered = useMemo(() => products.filter((p) => {
    const needle = query.trim().toLowerCase();
    const category = categories.find((c) => c._id === p.categoryId)?.name || "";
    const matchesText = !needle || [p.name, p.nameBn, p.sku, p.brand, category]
      .some((v) => (v || "").toLowerCase().includes(needle));
    return matchesText && (!brandName || p.brand === brandName);
  }), [products, query, brandName, categories]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const customerMatches = customers.filter((c) =>
    [c.name, c.nameBn, c.mobile, c.bin].some((v) => (v || "").toLowerCase().includes(customerQuery.toLowerCase())),
  ).slice(0, 8);
  const attentionMatches = customers.filter((c) =>
    [c.name, c.nameBn, c.mobile].some((v) => (v || "").toLowerCase().includes(attention.toLowerCase())),
  ).slice(0, 8);

  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.sellPrice, 0);
  const lineDiscount = cart.reduce((sum, i) => sum + cartLineDiscount(i), 0);
  const discountBase = Math.max(0, subtotal - lineDiscount);
  const orderDiscount = Math.min(
    discountBase,
    discountType === "percentage" ? discountBase * Math.min(100, discountValue) / 100 : discountValue,
  );
  const totalDiscount = lineDiscount + orderDiscount;
  const grandTotal = Math.max(0, subtotal - totalDiscount);
  const paid = payRows.reduce((sum, p) => p.method === "credit" ? sum : sum + Math.max(0, p.amount), 0);
  const due = Math.max(0, grandTotal - paid);

  function chooseCustomer(c: Customer) {
    const displayName = locale === "bn" && c.nameBn ? c.nameBn : c.name;
    setCustomerId(c._id); setCustomerName(displayName);
    setCustomerQuery(displayName);
    setCustomerMobile(c.mobile || ""); setCustomerAddress(c.address || "");
    setCustomerEmail(c.email || ""); setCustomerMenu(false);
    setDocumentBody((current) => withQuotationCompanyName(current, displayName));
  }
  function addProduct(p: Product) {
    const stock = Number(p.locationQty || 0);
    setCart((old) => {
      const found = old.find((x) => x._id === p._id);
      if (found && stock > 0 && found.qty >= stock) {
        setMessage(`Insufficient stock — available ${stock}`); return old;
      }
      return found
        ? old.map((x) => x._id === p._id ? { ...x, qty: x.qty + 1 } : x)
        : [...old, { ...p, qty: 1, bonusQty: 0, saleDescription: p.description || "", lineDiscount: 0, lineDiscountType: "fixed" }];
    });
    setProductResultsOpen(false);
  }
  function updateItem(id: string, patch: Partial<CartItem>) {
    setCart((old) => old.map((x) => x._id === id ? { ...x, ...patch } : x));
  }
  function updateQuantity(item: CartItem, quantity: number) {
    const next = Math.max(1, Number(quantity) || 1);
    const stock = Number(item.locationQty || 0);
    if (stock > 0 && next > stock) {
      setMessage(`Insufficient stock — available ${stock}`);
      return;
    }
    updateItem(item._id, { qty: next });
  }
  function reset() {
    setCart([]); setCustomerId(""); setCustomerQuery(""); setCustomerName("");
    setCustomerMobile(""); setCustomerAddress(""); setCustomerEmail(""); setAttention("");
    setQuotationNo(""); setReferenceNo(""); setSourceQuotationId(""); setSourceSaleId(""); setSaleDate(today());
    setChallanQuery(""); setChallanHits([]); setChallanMenu(false);
    setNote(""); setDocumentBody(DEFAULT_DOCUMENT_BODY); setSavedTermQuery(""); setDiscountValue(0); setPayRows([payRow()]); setMessage("");
    setSearch(""); setBrandName(""); setCategoryId(""); setProductResultsOpen(false);
    quotationNumberPending.current = false; referenceNumberPending.current = false; reservedQuotationNo.current = "";
    setQuoteSearch(""); setQuoteHits([]); setQuoteMenu(false);
  }
  async function ensureDocumentNumber(kind: "quotation" | "reference" | "challan") {
    if (isReturnEntry) return;
    const fieldKind = kind === "challan" ? "quotation" : kind;
    const hasValue = fieldKind === "quotation" ? quotationNo.trim() : referenceNo.trim();
    const pending = fieldKind === "quotation" ? quotationNumberPending : referenceNumberPending;
    if (hasValue || pending.current) return;
    pending.current = true;
    try {
      const res = await fetch(`/api/sales/numbers?kind=${kind}`);
      const json = await res.json();
      if (!res.ok || !json.value) return;
      if (fieldKind === "quotation") {
        reservedQuotationNo.current = String(json.value);
        setQuotationNo((current) => current || String(json.value));
      } else {
        setReferenceNo((current) => current || String(json.value));
      }
    } finally {
      pending.current = false;
    }
  }
  function applyQuotation(quote: Record<string, unknown>) {
    setSourceQuotationId(String(quote._id));
    setQuotationNo(String(quote.quotationNo || ""));
    setQuoteSearch(String(quote.quotationNo || quote.pfNo || ""));
    setReferenceNo(String(quote.referenceNo || ""));
    setCustomerId(String(quote.customerId || ""));
    setCustomerName(String(quote.customerName || ""));
    setCustomerQuery(String(quote.customerName || ""));
    setCustomerMobile(String(quote.customerMobile || ""));
    setCustomerAddress(String(quote.customerAddress || ""));
    setCustomerEmail(String(quote.customerEmail || ""));
    setAttention(String(quote.attention || ""));
    setSaleDate(String(quote.saleDate || "").slice(0, 10) || today());
    setNote(String(quote.terms || quote.note || ""));
    setDocumentBody(quote.documentBody != null ? String(quote.documentBody) : DEFAULT_DOCUMENT_BODY);
    setSavedTermQuery("");
    const loaded = (Array.isArray(quote.items) ? quote.items : []).map((i: Record<string, unknown>, idx: number) => ({
      _id: String(i.productId || `${quote._id}-${i.sku || idx}`),
      name: String(i.name || ""),
      sku: String(i.sku || ""),
      sellPrice: Number(i.unitPrice || 0),
      unit: String(i.unit || "Pcs"),
      imageUrl: String(i.imageUrl || ""),
      qty: Number(i.qty || 1),
      bonusQty: Number(i.bonusQty || 0),
      saleDescription: String(i.description || ""),
      lineDiscount: Number(i.discount || 0),
      lineDiscountType: "fixed" as const,
    }));
    setCart(loaded);
    setDiscountValue(Math.max(0, Number(quote.discount || 0) - loaded.reduce((s: number, i: CartItem) => s + cartLineDiscount(i), 0)));
    setDiscountType("fixed");
    const pays = Array.isArray(quote.payments) ? quote.payments : [];
    setPayRows(
      pays.length
        ? pays.map((p: Record<string, unknown>) => ({
            id: `${Date.now()}-${Math.random()}`,
            method: String(p.method || "cash"),
            amount: Number(p.amount || 0),
          }))
        : [payRow()],
    );
    reservedQuotationNo.current = String(quote.quotationNo || "");
    setMessage(`Loaded quotation: ${quote.quotationNo}`);
  }

  async function loadQuotation() {
    if (!quotationNo.trim()) return;
    try {
      const needle = quotationNo.trim();
      const json = await fetch(
        `/api/sales?status=quotation&limit=10&q=${encodeURIComponent(needle)}`,
      ).then((r) => r.json());
      const rows = (json.data || []) as Record<string, unknown>[];
      const up = needle.toUpperCase();
      const exact = rows.filter((r) =>
        [r.quotationNo, r.pfNo, r.poNo].some((v) => String(v || "").toUpperCase() === up),
      );
      const quote = exact[0] || (rows.length === 1 ? rows[0] : null);
      if (!quote) return setMessage(rows.length ? "Select the exact quotation" : "Quotation not found");
      applyQuotation(quote);
    } catch { setMessage(t("common.error")); }
  }

  async function searchQuotations(needle: string) {
    const q = needle.trim();
    if (!q) { setQuoteHits([]); return; }
    try {
      const json = await fetch(`/api/sales?status=quotation&limit=20&q=${encodeURIComponent(q)}`).then((r) => r.json());
      const rows = (json.data || []) as QuoteHit[];
      const up = q.toUpperCase();
      const ranked = [...rows].sort((a, b) => {
        const ax = [a.quotationNo, a.pfNo, a.poNo].some((v) => String(v || "").toUpperCase() === up) ? 0 : 1;
        const bx = [b.quotationNo, b.pfNo, b.poNo].some((v) => String(v || "").toUpperCase() === up) ? 0 : 1;
        return ax - bx;
      });
      setQuoteHits(ranked.slice(0, 8));
      setQuoteMenu(true);
    } catch { setQuoteHits([]); }
  }

  async function chooseQuotation(hit: QuoteHit) {
    setQuoteMenu(false);
    try {
      const json = await fetch(`/api/sales/${hit._id}`).then((r) => r.json());
      if (json.data) applyQuotation(json.data);
    } catch { setMessage(t("common.error")); }
  }

  function applySaleToReturnForm(sale: Record<string, unknown>, challanNo?: string) {
    setSourceSaleId(String(sale._id || ""));
    setCustomerId(String(sale.customerId || ""));
    setCustomerName(String(sale.customerName || ""));
    setCustomerQuery(String(sale.customerName || ""));
    setCustomerMobile(String(sale.customerMobile || ""));
    setCustomerAddress(String(sale.customerAddress || ""));
    setCustomerEmail(String(sale.customerEmail || ""));
    setAttention(String(sale.attention || ""));
    setSaleDate(String(sale.saleDate || "").slice(0, 10) || today());
    setQuotationNo(String(challanNo || sale.challanNo || ""));
    setReferenceNo(String(sale.referenceNo || ""));
    setNote(String(sale.terms || sale.note || ""));
    setDocumentBody(sale.documentBody != null ? String(sale.documentBody) : DEFAULT_DOCUMENT_BODY);
    const loaded = (Array.isArray(sale.items) ? sale.items : []).map((i: Record<string, unknown>, idx: number) => ({
      _id: String(i.productId || `${sale._id}-${i.sku || idx}`),
      name: String(i.name || ""),
      sku: String(i.sku || ""),
      sellPrice: Number(i.unitPrice || 0),
      unit: String(i.unit || "Pcs"),
      imageUrl: String(i.imageUrl || ""),
      qty: Number(i.qty || 1),
      bonusQty: Number(i.bonusQty || 0),
      saleDescription: String(i.description || ""),
      lineDiscount: Number(i.discount || 0),
      lineDiscountType: "fixed" as const,
      locationQty: Number(i.qty || 0) + 99999,
    }));
    setCart(loaded);
    setDiscountValue(Math.max(0, Number(sale.discount || 0) - loaded.reduce((s, i) => s + cartLineDiscount(i), 0)));
    setDiscountType("fixed");
    const pays = Array.isArray(sale.payments) ? sale.payments : [];
    setPayRows(pays.length
      ? pays.map((p: Record<string, unknown>) => ({ id: `${Date.now()}-${Math.random()}`, method: String(p.method || "cash"), amount: Number(p.amount || 0) }))
      : [payRow()]);
  }

  async function searchChallans(needle: string) {
    const q = needle.trim();
    if (!q) { setChallanHits([]); return; }
    try {
      const json = await fetch(`/api/modules/shipments?limit=30&q=${encodeURIComponent(q)}`).then((r) => r.json());
      const rows = Array.isArray(json.data) ? json.data as ChallanHit[] : [];
      setChallanHits(rows.filter((row) => String(row.shipmentNo || "").toLowerCase().includes(q.toLowerCase())).slice(0, 8));
      setChallanMenu(true);
    } catch { setChallanHits([]); }
  }

  async function chooseChallan(hit: ChallanHit) {
    setChallanQuery(hit.shipmentNo || "");
    setChallanMenu(false);
    try {
      if (hit.saleId) {
        const json = await fetch(`/api/sales/${hit.saleId}`).then((r) => r.json());
        if (json.data) {
          applySaleToReturnForm(json.data, hit.shipmentNo);
          setMessage(`Loaded challan: ${hit.shipmentNo}`);
          return;
        }
      }
      setCustomerName(hit.customerName || "");
      setCustomerQuery(hit.customerName || "");
      setQuotationNo(hit.shipmentNo || "");
      setReferenceNo(hit.referenceNo || "");
      setMessage(`Loaded challan: ${hit.shipmentNo}`);
    } catch { setMessage(t("common.error")); }
  }

  async function saveSellReturn() {
    if (!cart.length) return setMessage("Order items are required");
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/modules/sell-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: sourceSaleId || undefined,
          locationId: locationId || undefined,
          customerId: customerId || undefined,
          customerName: customerName.trim() || "Walk-in Customer",
          customerMobile,
          customerAddress,
          customerEmail,
          attention,
          challanNo: quotationNo,
          referenceNo,
          terms: note,
          documentBody,
          note,
          returnDate: saleDate,
          discount: totalDiscount,
          grandTotal,
          paidAmount: paid,
          dueAmount: due,
          items: cart.map((i) => ({
            productId: i._id,
            name: i.name,
            sku: i.sku,
            description: i.saleDescription,
            qty: i.qty,
            unitPrice: i.sellPrice,
            discount: cartLineDiscount(i),
            lineTotal: Math.max(0, i.qty * i.sellPrice - cartLineDiscount(i)),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      reset();
      setMessage(`Saved sell return: ${json.data?.returnNo || ""}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : t("common.error")); } finally { setBusy(false); }
  }

  async function save(status: "draft" | "quotation" | "final" | "suspended", usePayments = false) {
    if (!cart.length || !locationId) return setMessage("Location and order items are required");
    if (usePayments && paid > grandTotal + .009) return setMessage("Payment cannot exceed grand total");
    setBusy(true); setMessage("");
    const payload = {
      locationId, customerId: customerId || undefined,
      customerName: customerName.trim() || "Walk-in Customer", customerMobile,
      customerAddress, customerEmail, attention, saleDate, sourceQuotationId: status === "final" && !isChallanEntry ? sourceQuotationId || undefined : undefined,
      status: isChallanEntry && status === "quotation" ? "final" : status,
      quotationNo: isChallanEntry ? undefined : quotationNo,
      challanNo: isChallanEntry ? quotationNo : undefined,
      referenceNo, note, terms: note, documentBody, discount: totalDiscount, tax: 0, shipping: 0,
      items: cart.map((i) => ({
        productId: /^[a-f0-9]{24}$/i.test(String(i._id)) ? i._id : undefined, name: i.name, sku: i.sku, unit: i.unit || "Pcs", qty: i.qty,
        bonusQty: i.bonusQty, unitPrice: i.sellPrice, discount: cartLineDiscount(i),
        description: i.saleDescription, imageUrl: i.imageUrl || "",
      })),
      payments: (status === "final" || isChallanEntry) && usePayments
        ? payRows.filter((p) => p.amount > 0).map(({ method, amount }) => ({ method, amount }))
        : [],
    };
    try {
      const updatingQuote = status === "quotation" && !isChallanEntry && !isBillEntry && !!sourceQuotationId;
      const res = await fetch(updatingQuote ? `/api/sales/${sourceQuotationId}` : "/api/sales", {
        method: updatingQuote ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      reset(); setMessage(`Saved: ${json.data.quotationNo || json.data.invoiceNo || json.data.referenceNo}`);
      await loadProducts();
      if (json.data?._id) {
        const id = json.data._id;
        const savedAsFinal = isChallanEntry || status === "final";
        window.open(
          isChallanEntry && savedAsFinal
            ? `/sales/${id}/challan`
            : status === "quotation"
              ? `/sales/${id}/quotation`
              : `/sales/${id}/invoice`,
          "_blank",
        );
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : t("common.error")); } finally { setBusy(false); }
  }
  async function addCustomer() {
    if (!newCust.name.trim() || !newCust.mobile.trim()) return;
    try {
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "customer", ...newCust }) });
      const json = await res.json(); if (!res.ok) throw new Error();
      setCustomers((old) => [json.data, ...old]); chooseCustomer(json.data);
      setCustOpen(false); setNewCust({ name: "", mobile: "" });
    } catch { setMessage(t("common.error")); }
  }

  return (
    <div className="pos-quote space-y-1.5">
      <section className="gp-card overflow-hidden">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xl font-bold text-[var(--gp-ink)]">
            <span className="rounded-lg bg-[var(--gp-primary)] p-1.5 text-white"><FileText className="h-5 w-5" /></span>
            {isReturnEntry ? "Sell Return" : isChallanEntry ? "Challan" : isBillEntry ? "Bill" : "Quotation"}
            {isReturnEntry ? (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="gp-input gp-input-icon-left h-9 text-sm font-normal"
                  value={challanQuery}
                  placeholder="Search by challan number"
                  onFocus={() => { if (challanHits.length) setChallanMenu(true); }}
                  onChange={(e) => { const value = e.target.value; setChallanQuery(value); void searchChallans(value); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && challanHits[0]) { e.preventDefault(); void chooseChallan(challanHits[0]); } }}
                />
                {challanMenu && challanHits.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white p-1 text-left text-sm font-normal shadow-xl">
                    {challanHits.map((hit) => (
                      <button
                        key={hit._id}
                        type="button"
                        onClick={() => void chooseChallan(hit)}
                        className="block w-full rounded-md px-3 py-2 text-left hover:bg-[var(--gp-primary-soft)]"
                      >
                        {hit.shipmentNo}
                        <span className="ml-2 text-muted">{hit.customerName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : !isChallanEntry && !isBillEntry ? (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="gp-input gp-input-icon-left h-9 text-sm font-normal"
                  value={quoteSearch}
                  placeholder="Search Quotation / PI No"
                  onFocus={() => { if (quoteHits.length) setQuoteMenu(true); }}
                  onChange={(e) => { const value = e.target.value; setQuoteSearch(value); void searchQuotations(value); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quoteHits[0]) {
                      e.preventDefault();
                      void chooseQuotation(quoteHits[0]);
                    }
                  }}
                />
                {quoteMenu && quoteHits.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white p-1 text-left text-sm font-normal shadow-xl">
                    {quoteHits.map((hit) => (
                      <button
                        key={hit._id}
                        type="button"
                        onClick={() => void chooseQuotation(hit)}
                        className="block w-full rounded-md px-3 py-2 text-left hover:bg-[var(--gp-primary-soft)]"
                      >
                        {hit.quotationNo || hit.pfNo || hit.poNo}
                        <span className="ml-2 text-muted">{hit.customerName}</span>
                        {hit.referenceNo ? <span className="ml-2 text-muted">{hit.referenceNo}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <button className="gp-btn gp-btn-primary" type="button" onClick={reset}><Plus className="h-4 w-4" />New Order</button>
          <Link className="gp-btn gp-btn-ghost" href="/contacts/import"><Upload className="h-4 w-4" />Import Customer</Link>
        </header>

        <div className="space-y-1.5 p-1.5">
          <div className="rounded-xl border border-line bg-[#fbfdff] p-1">
            <div className="grid grid-cols-1 items-center gap-x-2 gap-y-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(11.5rem,0.7fr)_minmax(12.5rem,0.85fr)_minmax(10rem,0.7fr)]">
              <Field label="Customer Name" className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap">
                <div className="relative min-w-0 flex-1">
                  <div className="flex gap-1"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="gp-input gp-input-icon-left" value={customerQuery} placeholder="Search by name, code or mobile..."
                    onFocus={() => setCustomerMenu(true)}
                    onChange={(e) => { setCustomerQuery(e.target.value); setCustomerName(e.target.value); setCustomerId(""); setCustomerMenu(true); }} /></div><button type="button" className="gp-btn gp-btn-primary shrink-0 px-2" onClick={() => setCustOpen(true)} aria-label="Add customer"><UserPlus className="h-4 w-4" /></button></div>
                  {customerMenu && customerQuery && customerMatches.length > 0 && (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white p-1 shadow-xl">
                      {customerMatches.map((c) => <button key={c._id} type="button" onClick={() => chooseCustomer(c)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--gp-primary-soft)]">{c.name}<span className="ml-2 text-muted">{c.mobile}</span></button>)}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Date" className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap"><div className="relative min-w-0 flex-1"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input type="date" className="gp-input gp-input-icon-left" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div></Field>
              <Field label={isReturnEntry || isChallanEntry ? "Challan No" : "Quotation/PI No"} className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap"><input className="gp-input min-w-0 flex-1" value={quotationNo} onFocus={() => { if (!isReturnEntry) void ensureDocumentNumber(isChallanEntry ? "challan" : "quotation"); }} onChange={(e) => setQuotationNo(e.target.value.toUpperCase())} onKeyDown={(e) => { if (!isChallanEntry && !isReturnEntry && e.key === "Enter" && quotationNo.trim() && quotationNo !== reservedQuotationNo.current) void loadQuotation(); }} placeholder={isReturnEntry ? "From selected challan" : "Auto-generated on focus"} /></Field>
              <Field label="REF No" className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap"><input className="gp-input min-w-0 flex-1" value={referenceNo} onFocus={() => { if (!isReturnEntry) void ensureDocumentNumber("reference"); }} onChange={(e) => setReferenceNo(e.target.value)} placeholder={isReturnEntry ? "From selected challan" : "Auto-generated on focus"} /></Field>
            </div>
            <div className="mt-0.5 grid grid-cols-1 items-center gap-x-2 gap-y-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(11.5rem,0.72fr)]">
              <Field label="Address" className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap"><div className="relative min-w-0 flex-1"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="gp-input gp-input-icon-left" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Address" /></div></Field>
              <Field label="Attention" className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    className="gp-input gp-input-icon-left"
                    value={attention}
                    placeholder="Search / select name"
                    onFocus={() => setAttentionMenu(true)}
                    onChange={(e) => { setAttention(e.target.value); setAttentionMenu(true); }}
                  />
                  {attentionMenu && attentionMatches.length > 0 && (
                    <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white p-1 shadow-xl">
                      {attentionMatches.map((c) => (
                        <button
                          key={`att-${c._id}`}
                          type="button"
                          onClick={() => {
                            setAttention(locale === "bn" && c.nameBn ? c.nameBn : c.name);
                            setAttentionMenu(false);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--gp-primary-soft)]"
                        >
                          {c.name}<span className="ml-2 text-muted">{c.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Contact No" className="flex min-w-0 flex-row items-center gap-1.5 space-y-0 [&>span]:shrink-0 [&>span]:whitespace-nowrap"><input className="gp-input min-w-0 flex-1" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="Contact No" /></Field>
            </div>
          </div>

          <section className="rounded-xl border border-line p-1.5">
            <div className="mb-1 grid grid-cols-1 items-center gap-1.5 md:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(9.5rem,0.38fr)_minmax(10rem,0.38fr)]">
              <h2 className="m-0 flex shrink-0 items-center gap-2 text-sm font-bold"><PackagePlus className="h-4 w-4 text-primary" />Order Items</h2>
              <div className="relative min-w-0 md:col-span-1 lg:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="gp-input gp-input-icon-left" value={search} onChange={(e) => { const value = e.target.value; setSearch(value); setPage(1); setProductResultsOpen(Boolean(value.trim() || brandName || categoryId)); }} placeholder="Search product by name, SKU, category or brand..." /></div>
              <select aria-label="Brand filter" className="gp-input min-w-0" value={brandName} onChange={(e) => { const value = e.target.value; setBrandName(value); setPage(1); setProductResultsOpen(Boolean(value || search.trim() || categoryId)); }}><option value="">All Brands</option>{brands.map((b) => <option key={b._id} value={b.name}>{b.name}</option>)}</select>
              <select aria-label="Category filter" className="gp-input min-w-0" value={categoryId} onChange={(e) => { const value = e.target.value; setCategoryId(value); setPage(1); setProductResultsOpen(Boolean(value || search.trim() || brandName)); }}><option value="">All Categories</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
            </div>
            {productResultsOpen && (loading && !visible.length ? <p className="py-6 text-center text-muted">Loading products...</p> : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {visible.map((p) => {
                  const stock = Number(p.locationQty || 0);
                  return <button key={p._id} type="button" disabled={stock <= 0} onClick={() => addProduct(p)} className="group rounded-xl border border-line bg-white p-2 text-left transition hover:-translate-y-0.5 hover:border-[var(--gp-primary)] hover:shadow-md disabled:opacity-50">
                    <div className="flex min-h-28 items-stretch gap-2">
                      <div className="flex w-1/2 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="aspect-square h-full max-h-32 w-full object-contain" />
                        ) : <ImageIcon className="h-8 w-8 text-slate-300" />}
                      </div>
                      <div className="flex min-w-0 w-1/2 flex-col justify-center py-1">
                        <p className="line-clamp-2 font-semibold leading-snug">{locale === "bn" && p.nameBn ? p.nameBn : p.name}</p>
                        <p className="gp-money mt-1.5 font-bold text-primary">{formatBDT(p.sellPrice, locale)}</p>
                        <p className="mt-1 text-xs text-muted">Stock: <span className={stock > 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>{stock}</span></p>
                        <p className="mt-1 truncate text-xs text-muted" title={p.brand || ""}>Brand: {p.brand || "—"}</p>
                        <p className="mt-1 truncate text-[0.7rem] text-muted">SKU: {p.sku}</p>
                      </div>
                    </div>
                  </button>;
                })}
              </div>
            ))}
            {productResultsOpen && pages > 1 && <div className="mt-2 flex items-center justify-center gap-2"><button type="button" className="gp-btn gp-btn-ghost" disabled={page === 1} onClick={() => setPage((x) => x - 1)}>Previous</button><span className="text-sm text-muted">Page {page} of {pages}</span><button type="button" className="gp-btn gp-btn-ghost" disabled={page === pages} onClick={() => setPage((x) => x + 1)}>Next</button></div>}
          </section>

          {cart.length > 0 && <div className="overflow-x-auto rounded-xl border border-line">
            <table className="gp-table pos-quote-items pos-quote-line-widths">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>QTY</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>{cart.map((i, index) => {
                const lineTotal = Math.max(0, i.qty * i.sellPrice - cartLineDiscount(i));
                return (
                  <tr key={i._id}>
                    <td>{index + 1}</td>
                    <td className="min-w-0">
                      <textarea
                        className="gp-input pos-quote-resizable w-full min-w-0"
                        rows={1}
                        value={i.name}
                        onChange={(e) => updateItem(i._id, { name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation(); }}
                      />
                    </td>
                    <td className="min-w-0">
                      <textarea
                        className="gp-input pos-quote-desc pos-quote-resizable w-full min-w-0"
                        rows={1}
                        value={i.saleDescription}
                        onChange={(e) => updateItem(i._id, { saleDescription: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") e.stopPropagation(); }}
                      />
                    </td>
                    <td>
                      <input type="number" min={1} max={i.locationQty || undefined} className="gp-input w-full min-w-0" value={i.qty} onChange={(e) => updateQuantity(i, Number(e.target.value))} />
                    </td>
                    <td>
                      <input type="number" min={0} className="gp-input w-full min-w-0" value={i.sellPrice} onChange={(e) => updateItem(i._id, { sellPrice: Math.max(0, Number(e.target.value)) })} />
                    </td>
                    <td>
                      <div className="relative min-w-0">
                        <input type="number" min={0} max={i.lineDiscountType === "percentage" ? 100 : i.qty * i.sellPrice} className="gp-input w-full min-w-0 !pr-7" value={i.lineDiscount} onChange={(e) => updateItem(i._id, { lineDiscount: Math.max(0, Number(e.target.value)) })} />
                        <select className="absolute inset-y-0 right-0 z-10 w-7 cursor-pointer border-0 bg-transparent px-0 text-xs" value={i.lineDiscountType || "fixed"} onChange={(e) => updateItem(i._id, { lineDiscountType: e.target.value as "percentage" | "fixed" })}>
                          <option value="percentage">%</option>
                          <option value="fixed">৳</option>
                        </select>
                      </div>
                    </td>
                    <td className="gp-money font-bold">{formatBDT(lineTotal, locale)}</td>
                    <td>
                      <button type="button" className="p-1 text-red-500" onClick={() => setCart((old) => old.filter((x) => x._id !== i._id))}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>}

          <div className="grid grid-cols-1 items-stretch gap-1.5 lg:grid-cols-2">
            <section className="rounded-xl border border-line p-1.5">
              <div className="mb-1 flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <h2 className="m-0 flex shrink-0 items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary" />Terms and Condition</h2>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    className="gp-input gp-input-icon-left"
                    list="quotation-saved-terms"
                    value={savedTermQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSavedTermQuery(value);
                      const selected = savedTerms.find((term) => term === value);
                      if (!selected) return;
                      setNote((current) => {
                        const existing = current
                          .split("\n")
                          .map((line) => line.replace(/^[-•◆]\s*/, "").trim())
                          .filter(Boolean);
                        if (existing.includes(selected)) return current;
                        return current.trim() ? `${current.replace(/\s+$/, "")}\n${selected}` : selected;
                      });
                      setSavedTermQuery("");
                    }}
                    placeholder="Search saved terms or write directly below..."
                  />
                  <datalist id="quotation-saved-terms">
                    {savedTerms.map((term) => <option key={term} value={term} />)}
                  </datalist>
                </div>
              </div>
              <textarea className="gp-input min-h-14 resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter notes, delivery instructions, or terms and conditions..." />
            </section>
            <section className="rounded-xl border border-line p-1.5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary" />{isReturnEntry ? "Sell Return Description" : isChallanEntry ? "Challan Description" : "Quotation Description"}</h2>
              <textarea className="gp-input min-h-14 resize-y" value={documentBody} onChange={(e) => setDocumentBody(e.target.value)} />
            </section>
          </div>

          <div className="grid items-stretch gap-1.5 md:grid-cols-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(10.75rem,0.38fr)]">
            <section className="rounded-xl border border-line p-1.5">
              <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setPayRows((old) => [...old, payRow()])}><Plus className="h-4 w-4" />Add Payment</button>
              <div className="mt-1.5 space-y-1.5">{payRows.map((p) => <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-2"><select className="gp-input" value={p.method} onChange={(e) => setPayRows((old) => old.map((x) => x.id === p.id ? { ...x, method: e.target.value } : x))}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select><input type="number" min={0} className="gp-input" value={p.amount || ""} placeholder="Amount" onChange={(e) => setPayRows((old) => old.map((x) => x.id === p.id ? { ...x, amount: Math.max(0, Number(e.target.value)) } : x))} /><button type="button" className="p-2 text-red-500" disabled={payRows.length === 1} onClick={() => setPayRows((old) => old.filter((x) => x.id !== p.id))}><X className="h-4 w-4" /></button></div>)}</div>
            </section>
            <section className="rounded-xl border border-line bg-[#fbfdff] p-1.5">
              <h2 className="mb-1.5 flex items-center gap-2 text-sm font-bold"><Grid2X2 className="h-4 w-4 text-primary" />{isReturnEntry ? "Sell Return Summary" : isChallanEntry ? "Challan Summary" : isBillEntry ? "Bill Summary" : "Quotation Summary"}</h2>
              <div className="space-y-1 text-sm"><div className="flex justify-between gap-3"><span>Subtotal</span><b className="gp-money min-w-[11rem] shrink-0 text-right">{formatBDT(subtotal, locale)}</b></div><div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><span>Total Discount</span><div className="flex min-w-0 max-w-full"><input type="number" min={0} className="gp-input min-w-0 flex-1 rounded-r-none" value={discountValue} onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))} /><select className="gp-input !w-[2.65rem] !min-w-[2.65rem] !max-w-[2.65rem] shrink-0 grow-0 rounded-l-none px-1" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}><option value="percentage">%</option><option value="fixed">৳</option></select></div></div><div className="flex justify-between text-xs text-muted"><span>Including line discounts</span><span>{formatBDT(totalDiscount, locale)}</span></div><div className="flex justify-between rounded-lg border border-line bg-white p-1.5 text-lg"><b>Grand Total</b><b className="gp-money text-primary">{formatBDT(grandTotal, locale)}</b></div><div className="flex justify-between px-2 text-base"><b>Due Amount</b><b className="gp-money text-red-500">{formatBDT(due, locale)}</b></div></div>
            </section>
            <div className="flex flex-col justify-between gap-2 md:col-span-2 lg:col-span-1">
              {isReturnEntry ? (
                <button type="button" className="gp-btn gp-btn-primary w-full" disabled={busy || !cart.length} onClick={() => void saveSellReturn()}>{busy ? "Saving..." : "Save Sell Return"}</button>
              ) : isChallanEntry ? (
                <button type="button" className="gp-btn gp-btn-primary w-full" disabled={busy || !cart.length} onClick={() => void save("final", true)}>Save Challan</button>
              ) : isBillEntry ? null : (
                <button type="button" className="gp-btn gp-btn-primary w-full" disabled={busy || !cart.length} onClick={() => void save("quotation")}>Save Quotation</button>
              )}
              {isReturnEntry ? null : (
              <button type="button" className="gp-btn gp-btn-primary w-full" disabled={busy || !cart.length || paid > grandTotal + .009} onClick={() => void save("final", true)}><Wallet className="h-4 w-4" />{busy ? "Saving..." : "Complete Sale"}</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {message && <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-primary">{message}</p>}

      <Modal open={custOpen} title="Import Customer" onClose={() => setCustOpen(false)}>
        <div className="grid gap-3"><Field label="Customer Name"><input className="gp-input" value={newCust.name} onChange={(e) => setNewCust((x) => ({ ...x, name: e.target.value }))} /></Field><Field label="Contact No"><input className="gp-input" value={newCust.mobile} onChange={(e) => setNewCust((x) => ({ ...x, mobile: e.target.value }))} /></Field><div className="flex justify-end gap-2"><button type="button" className="gp-btn gp-btn-ghost" onClick={() => setCustOpen(false)}>Cancel</button><button type="button" className="gp-btn gp-btn-primary" onClick={() => void addCustomer()}><UserPlus className="h-4 w-4" />Save Customer</button></div></div>
      </Modal>
    </div>
  );
}

export default function PosPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted">Loading...</p>}>
      <PosPageInner />
    </Suspense>
  );
}
