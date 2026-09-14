"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays, FileText, Grid2X2, ImageIcon, MapPin, PackagePlus, Plus,
  Search, Trash2, Upload, UserPlus, Wallet, X,
} from "lucide-react";
import { Field, Modal } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks";

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
};
type PayRow = { id: string; method: string; amount: number };

const PAGE_SIZE = 20;
const METHODS = ["cash", "card", "bank", "bkash", "nagad", "rocket", "cheque", "credit"] as const;
const today = () => new Date().toISOString().slice(0, 10);
const payRow = (): PayRow => ({ id: `${Date.now()}-${Math.random()}`, method: "cash", amount: 0 });

export default function PosPage() {
  const t = useTranslations();
  const locale = useLocale();
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
  const [saleDate, setSaleDate] = useState(today);
  const [quotationNo, setQuotationNo] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [sourceQuotationId, setSourceQuotationId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [productResultsOpen, setProductResultsOpen] = useState(false);
  const query = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");
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
          (quotations.data || [])
            .map((quotation: { terms?: string }) => quotation.terms?.trim())
            .filter((value: string | undefined): value is string => Boolean(value)),
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

  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.sellPrice, 0);
  const lineDiscount = cart.reduce((sum, i) => sum + Math.min(i.lineDiscount, i.qty * i.sellPrice), 0);
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
    setCustomerId(c._id); setCustomerName(locale === "bn" && c.nameBn ? c.nameBn : c.name);
    setCustomerQuery(locale === "bn" && c.nameBn ? c.nameBn : c.name);
    setCustomerMobile(c.mobile || ""); setCustomerAddress(c.address || "");
    setCustomerEmail(c.email || ""); setCustomerMenu(false);
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
        : [...old, { ...p, qty: 1, bonusQty: 0, saleDescription: p.description || "", lineDiscount: 0 }];
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
    setCustomerMobile(""); setCustomerAddress(""); setCustomerEmail("");
    setQuotationNo(""); setReferenceNo(""); setSourceQuotationId(""); setSaleDate(today());
    setNote(""); setSavedTermQuery(""); setDiscountValue(0); setPayRows([payRow()]); setMessage("");
    setSearch(""); setBrandName(""); setCategoryId(""); setProductResultsOpen(false);
  }
  async function loadQuotation() {
    if (!quotationNo.trim()) return;
    try {
      const json = await fetch(`/api/sales?quotationNo=${encodeURIComponent(quotationNo.trim())}&status=quotation&limit=1`).then((r) => r.json());
      const quote = json.data?.[0];
      if (!quote) return setMessage("Quotation not found");
      setSourceQuotationId(String(quote._id)); setQuotationNo(quote.quotationNo || "");
      setReferenceNo(quote.referenceNo || ""); setCustomerId(String(quote.customerId || ""));
      setCustomerName(quote.customerName || ""); setCustomerQuery(quote.customerName || "");
      setCustomerMobile(quote.customerMobile || ""); setCustomerAddress(quote.customerAddress || "");
      setCustomerEmail(quote.customerEmail || ""); setSaleDate(String(quote.saleDate || "").slice(0, 10) || today());
      setNote(quote.terms || quote.note || ""); setSavedTermQuery("");
      const loaded = (quote.items || []).map((i: Record<string, unknown>) => ({
        _id: String(i.productId || `${quote._id}-${i.sku}`), name: String(i.name || ""),
        sku: String(i.sku || ""), sellPrice: Number(i.unitPrice || 0), unit: String(i.unit || "Pcs"),
        imageUrl: String(i.imageUrl || ""), qty: Number(i.qty || 1), bonusQty: Number(i.bonusQty || 0),
        saleDescription: String(i.description || ""), lineDiscount: Number(i.discount || 0),
      }));
      setCart(loaded); setDiscountValue(Math.max(0, Number(quote.discount || 0) - loaded.reduce((s: number, i: CartItem) => s + i.lineDiscount, 0)));
      setDiscountType("fixed"); setMessage(`Loaded quotation: ${quote.quotationNo}`);
    } catch { setMessage(t("common.error")); }
  }
  async function save(status: "draft" | "quotation" | "final" | "suspended", usePayments = false) {
    if (!cart.length || !locationId) return setMessage("Location and order items are required");
    if (usePayments && paid > grandTotal + .009) return setMessage("Payment cannot exceed grand total");
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId, customerId: customerId || undefined,
          customerName: customerName.trim() || "Walk-in Customer", customerMobile,
          customerAddress, customerEmail, saleDate, sourceQuotationId: status === "final" ? sourceQuotationId || undefined : undefined,
          status, note, terms: note, discount: totalDiscount, tax: 0, shipping: 0,
          items: cart.map((i) => ({
            productId: i._id, name: i.name, sku: i.sku, unit: i.unit || "Pcs", qty: i.qty,
            bonusQty: i.bonusQty, unitPrice: i.sellPrice, discount: Math.min(i.lineDiscount, i.qty * i.sellPrice),
            description: i.saleDescription, imageUrl: i.imageUrl || "",
          })),
          payments: status === "final" && usePayments
            ? payRows.filter((p) => p.amount > 0).map(({ method, amount }) => ({ method, amount }))
            : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      reset(); setMessage(`Saved: ${json.data.quotationNo || json.data.invoiceNo || json.data.referenceNo}`);
      await loadProducts();
      if (json.data?._id) window.open(status === "quotation" ? `/sales/${json.data._id}/quotation` : `/sales/${json.data._id}/invoice`, "_blank");
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
    <div className="space-y-2">
      <section className="gp-card overflow-hidden">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <div className="flex flex-1 items-center gap-2 text-xl font-bold text-[var(--gp-ink)]">
            <span className="rounded-lg bg-[var(--gp-primary)] p-2 text-white"><FileText className="h-5 w-5" /></span>
            Quotation
          </div>
          <button className="gp-btn gp-btn-primary" type="button" onClick={reset}><Plus className="h-4 w-4" />New Order</button>
          <Link className="gp-btn gp-btn-ghost" href="/contacts/import"><Upload className="h-4 w-4" />Import Customer</Link>
        </header>

        <div className="space-y-2 p-2">
          <div className="grid gap-x-3 gap-y-1.5 rounded-xl border border-line bg-[#fbfdff] p-2 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer Name">
              <div className="relative">
                <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="gp-input gp-input-icon-left" value={customerQuery} placeholder="Search by name, code or mobile..."
                  onFocus={() => setCustomerMenu(true)}
                  onChange={(e) => { setCustomerQuery(e.target.value); setCustomerName(e.target.value); setCustomerId(""); setCustomerMenu(true); }} /></div><button type="button" className="gp-btn gp-btn-primary shrink-0 px-3" onClick={() => setCustOpen(true)} aria-label="Add customer"><UserPlus className="h-4 w-4" /></button></div>
                {customerMenu && customerQuery && customerMatches.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white p-1 shadow-xl">
                    {customerMatches.map((c) => <button key={c._id} type="button" onClick={() => chooseCustomer(c)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--gp-primary-soft)]">{c.name}<span className="ml-2 text-muted">{c.mobile}</span></button>)}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Contact No"><input className="gp-input" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="Contact No" /></Field>
            <Field label="Address"><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="gp-input gp-input-icon-left" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Address" /></div></Field>
            <Field label="Date"><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input type="date" className="gp-input gp-input-icon-left" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div></Field>
            <Field label="Quotation/PI No"><div className="flex gap-2"><input className="gp-input" value={quotationNo} onChange={(e) => setQuotationNo(e.target.value.toUpperCase())} placeholder="Auto-generated on save / enter to load" /><button type="button" className="gp-btn gp-btn-ghost px-3" onClick={() => void loadQuotation()}>Load</button></div></Field>
            <Field label="REF No"><input className="gp-input bg-slate-50" value={referenceNo} readOnly placeholder="Auto-generated on save" /></Field>
          </div>

          <section className="rounded-xl border border-line p-2">
            <h2 className="mb-1.5 flex items-center gap-2 text-sm font-bold"><PackagePlus className="h-4 w-4 text-primary" />Order Items</h2>
            <div className="mb-2 grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[auto_minmax(260px,1fr)_minmax(150px,0.45fr)_minmax(150px,0.45fr)]">
              <button type="button" className="gp-btn gp-btn-primary whitespace-nowrap" onClick={() => { const p = productsRef.current.find((x) => x.sku.toLowerCase() === search.trim().toLowerCase()); if (p) addProduct(p); }}><Plus className="h-4 w-4 shrink-0" /><span>Add Product</span></button>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="gp-input gp-input-icon-left" value={search} onChange={(e) => { const value = e.target.value; setSearch(value); setPage(1); setProductResultsOpen(Boolean(value.trim() || brandName || categoryId)); }} placeholder="Search product by name, SKU, category or brand..." /></div>
              <select aria-label="Brand filter" className="gp-input" value={brandName} onChange={(e) => { const value = e.target.value; setBrandName(value); setPage(1); setProductResultsOpen(Boolean(value || search.trim() || categoryId)); }}><option value="">All Brands</option>{brands.map((b) => <option key={b._id} value={b.name}>{b.name}</option>)}</select>
              <select aria-label="Category filter" className="gp-input" value={categoryId} onChange={(e) => { const value = e.target.value; setCategoryId(value); setPage(1); setProductResultsOpen(Boolean(value || search.trim() || brandName)); }}><option value="">All Categories</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
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
            <table className="gp-table min-w-[850px] [&_input]:min-h-8 [&_input]:py-1 [&_td]:py-1.5 [&_th]:py-1.5">
              <thead><tr><th className="w-12">SL</th><th>Name</th><th>Description</th><th className="w-24">QTY</th><th className="w-32">Price</th><th className="w-28">Discount</th><th className="w-32">Total</th><th className="w-12" /></tr></thead>
              <tbody>{cart.map((i, index) => {
                const lineTotal = Math.max(0, i.qty * i.sellPrice - i.lineDiscount);
                return <tr key={i._id}><td>{index + 1}</td><td><input className="gp-input min-w-40" value={i.name} onChange={(e) => updateItem(i._id, { name: e.target.value })} /></td><td><input className="gp-input min-w-52" value={i.saleDescription} onChange={(e) => updateItem(i._id, { saleDescription: e.target.value })} /></td><td><input type="number" min={1} max={i.locationQty || undefined} className="gp-input" value={i.qty} onChange={(e) => updateQuantity(i, Number(e.target.value))} /></td><td><input type="number" min={0} className="gp-input" value={i.sellPrice} onChange={(e) => updateItem(i._id, { sellPrice: Math.max(0, Number(e.target.value)) })} /></td><td><input type="number" min={0} max={i.qty * i.sellPrice} className="gp-input" value={i.lineDiscount} onChange={(e) => updateItem(i._id, { lineDiscount: Math.max(0, Number(e.target.value)) })} /></td><td className="gp-money font-bold">{formatBDT(lineTotal, locale)}</td><td><button type="button" className="p-2 text-red-500" onClick={() => setCart((old) => old.filter((x) => x._id !== i._id))}><Trash2 className="h-4 w-4" /></button></td></tr>;
              })}</tbody>
            </table>
          </div>}

          <section className="rounded-xl border border-line p-2">
            <h2 className="mb-1.5 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary" />Notes / Delivery Instructions</h2>
            <div className="mb-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="gp-input gp-input-icon-left"
                  list="quotation-saved-terms"
                  value={savedTermQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSavedTermQuery(value);
                    const selected = savedTerms.find((term) => term === value);
                    if (selected) setNote(selected);
                  }}
                  placeholder="Search saved terms or write directly below..."
                />
                <datalist id="quotation-saved-terms">
                  {savedTerms.map((term) => <option key={term} value={term} />)}
                </datalist>
              </div>
            </div>
            <textarea className="gp-input min-h-20 resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enter notes, delivery instructions, or terms and conditions..." />
          </section>

          <div className="grid gap-2 md:grid-cols-2">
            <section className="rounded-xl border border-line p-2">
              <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setPayRows((old) => [...old, payRow()])}><Plus className="h-4 w-4" />Add Payment</button>
              <div className="mt-2 space-y-1.5">{payRows.map((p) => <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-2"><select className="gp-input" value={p.method} onChange={(e) => setPayRows((old) => old.map((x) => x.id === p.id ? { ...x, method: e.target.value } : x))}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select><input type="number" min={0} className="gp-input" value={p.amount || ""} placeholder="Amount" onChange={(e) => setPayRows((old) => old.map((x) => x.id === p.id ? { ...x, amount: Math.max(0, Number(e.target.value)) } : x))} /><button type="button" className="p-2 text-red-500" disabled={payRows.length === 1} onClick={() => setPayRows((old) => old.filter((x) => x.id !== p.id))}><X className="h-4 w-4" /></button></div>)}</div>
            </section>
            <section className="rounded-xl border border-line bg-[#fbfdff] p-2">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><Grid2X2 className="h-4 w-4 text-primary" />Quotation Summary</h2>
              <div className="space-y-1.5 text-sm"><div className="flex justify-between"><span>Subtotal</span><b className="gp-money">{formatBDT(subtotal, locale)}</b></div><div className="grid grid-cols-[1fr_150px] items-center gap-2"><span>Total Discount</span><div className="flex"><input type="number" min={0} className="gp-input rounded-r-none" value={discountValue} onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))} /><select className="gp-input w-16 rounded-l-none px-1" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}><option value="percentage">%</option><option value="fixed">৳</option></select></div></div><div className="flex justify-between text-xs text-muted"><span>Including line discounts</span><span>{formatBDT(totalDiscount, locale)}</span></div><div className="flex justify-between rounded-lg border border-line bg-white p-2 text-lg"><b>Grand Total</b><b className="gp-money text-primary">{formatBDT(grandTotal, locale)}</b></div><div className="flex justify-between px-2 text-base"><b>Due Amount</b><b className="gp-money text-red-500">{formatBDT(due, locale)}</b></div></div>
            </section>
          </div>
        </div>
      </section>

      <div className="gp-card flex flex-wrap gap-2 p-2">
        <button type="button" className="gp-btn gp-btn-ghost" disabled={busy || !cart.length} onClick={() => void save("draft")}>Save Draft</button>
        <button type="button" className="gp-btn gp-btn-primary" disabled={busy || !cart.length} onClick={() => void save("quotation")}>Save Quotation</button>
        <button type="button" className="gp-btn gp-btn-ghost" disabled={busy || !cart.length} onClick={() => void save("suspended")}>Hold</button>
        <button type="button" className="gp-btn gp-btn-primary ml-auto" disabled={busy || !cart.length || paid > grandTotal + .009} onClick={() => void save("final", true)}><Wallet className="h-4 w-4" />{busy ? "Saving..." : "Complete Sale"}</button>
      </div>
      {message && <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-primary">{message}</p>}

      <Modal open={custOpen} title="Import Customer" onClose={() => setCustOpen(false)}>
        <div className="grid gap-3"><Field label="Customer Name"><input className="gp-input" value={newCust.name} onChange={(e) => setNewCust((x) => ({ ...x, name: e.target.value }))} /></Field><Field label="Contact No"><input className="gp-input" value={newCust.mobile} onChange={(e) => setNewCust((x) => ({ ...x, mobile: e.target.value }))} /></Field><div className="flex justify-end gap-2"><button type="button" className="gp-btn gp-btn-ghost" onClick={() => setCustOpen(false)}>Cancel</button><button type="button" className="gp-btn gp-btn-primary" onClick={() => void addCustomer()}><UserPlus className="h-4 w-4" />Save Customer</button></div></div>
      </Modal>
    </div>
  );
}
