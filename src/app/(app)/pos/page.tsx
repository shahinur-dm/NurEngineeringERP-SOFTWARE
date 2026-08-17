"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Calculator,
  Clock,
  Cpu,
  CreditCard,
  FileText,
  LayoutGrid,
  Pause,
  Pencil,
  Plus,
  Search,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { Field, Modal } from "@/components/ui";
import { CalculatorModal } from "@/components/CalculatorModal";
import { formatBDT, formatDateBD } from "@/lib/utils";
import { animateStagger } from "@/lib/gsap";
import { useDebouncedValue } from "@/lib/hooks";

type Product = {
  _id: string;
  name: string;
  nameBn?: string;
  sku: string;
  sellPrice: number;
  unit?: string;
  locationQty?: number;
  imageUrl?: string;
  description?: string;
  brand?: string;
  categoryId?: string;
};

type Customer = {
  _id: string;
  name: string;
  nameBn?: string;
  mobile?: string;
  address?: string;
  email?: string;
  bin?: string;
};

type CartItem = Product & { qty: number; bonusQty: number; saleDescription: string };

type Named = { _id: string; name: string; nameBn?: string };

type PayRow = { id: string; method: string; amount: number };

const PRODUCT_PAGE_SIZE = 6;
const PAY_METHODS = ["cash", "card", "bank", "bkash", "nagad", "rocket", "cheque", "credit"] as const;

function newPayRow(method = "cash", amount = 0): PayRow {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, method, amount };
}

export default function PosPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Named[]>([]);
  const [brands, setBrands] = useState<Named[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pfNo, setPfNo] = useState("");
  const [refNo, setRefNo] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [binNo, setBinNo] = useState("");
  const [quoteLookup, setQuoteLookup] = useState("");
  const [sourceQuotationId, setSourceQuotationId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [filterOpen, setFilterOpen] = useState<"category" | "brand" | null>(null);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [productPage, setProductPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState("cash");
  const [payRows, setPayRows] = useState<PayRow[]>(() => [newPayRow("cash", 0)]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [paidReceived, setPaidReceived] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [message, setMessage] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", mobile: "" });
  const [now, setNow] = useState(() => new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef<Product[]>([]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        setLocations(d.locations || []);
        if (d.locations?.[0]?._id) setLocationId(String(d.locations[0]._id));
      })
      .catch(() => setLocations([]));
    fetch("/api/contacts?type=customer&limit=200")
      .then((r) => r.json())
      .then((d) => setCustomers(d.data || []))
      .catch(() => setCustomers([]));
    fetch("/api/modules/categories?limit=200")
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []))
      .catch(() => setCategories([]));
    fetch("/api/modules/brands?limit=200")
      .then((r) => r.json())
      .then((d) => setBrands(d.data || []))
      .catch(() => setBrands([]));
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const qs = new URLSearchParams({ limit: "120" });
      if (debouncedQ) qs.set("q", debouncedQ);
      if (locationId) qs.set("locationId", locationId);
      if (categoryId) qs.set("categoryId", categoryId);
      const res = await fetch(`/api/products?${qs}`);
      const d = await res.json();
      setProducts(d.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [debouncedQ, locationId, categoryId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!gridRef.current || !products.length) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-pos-card]");
    animateStagger(cards, { y: 12, stagger: 0.03 });
  }, [products, productPage]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    setProductPage(1);
  }, [debouncedQ, categoryId, brandName]);

  useEffect(() => {
    const c = customers.find((x) => x._id === customerId);
    if (!c) {
      setCustomerName("");
      setCustomerAddress("");
      setCustomerMobile("");
      setCustomerEmail("");
      return;
    }
    setCustomerName(locale === "bn" && c.nameBn ? c.nameBn : c.name);
    setCustomerAddress(c.address || "");
    setCustomerMobile(c.mobile || "");
    setCustomerEmail(c.email || "");
    if (c.bin) setBinNo(c.bin);
  }, [customerId, customers, locale]);

  const visibleProducts = useMemo(() => {
    if (!brandName) return products;
    return products.filter((p) => (p.brand || "") === brandName);
  }, [products, brandName]);

  const productPages = Math.ceil(visibleProducts.length / PRODUCT_PAGE_SIZE);
  const safeProductPage = Math.min(productPage, Math.max(1, productPages));
  const pagedProducts = visibleProducts.slice(
    (safeProductPage - 1) * PRODUCT_PAGE_SIZE,
    safeProductPage * PRODUCT_PAGE_SIZE,
  );

  const subtotal = useMemo(
    () => cart.reduce((a, i) => a + i.qty * i.sellPrice, 0),
    [cart],
  );
  const itemCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const grandTotal = Math.max(0, subtotal - discount + tax + shipping);
  const collectedPaid = payRows.reduce(
    (a, r) => (r.method === "credit" ? a : a + Math.max(0, Number(r.amount) || 0)),
    0,
  );
  const remainingDue = Math.max(0, grandTotal - collectedPaid);
  const effectivePaid =
    payMethod === "credit" ? 0 : paidReceived == null ? grandTotal : Math.max(0, paidReceived);

  const selectedCustomer = customers.find((c) => c._id === customerId);
  const locationName = locations.find((l) => l._id === locationId)?.name || "";

  function updateLine(id: string, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((x) => (x._id === id ? { ...x, ...patch } : x)));
  }

  function setQty(id: string, qty: number, stock: number) {
    const next = Math.max(0, Number(qty) || 0);
    if (stock > 0 && next > stock) {
      setMessage(
        locale === "bn" ? `স্টক অপর্যাপ্ত — হাতে ${stock}` : `Insufficient stock — available ${stock}`,
      );
      return;
    }
    setCart((prev) =>
      prev.map((x) => (x._id === id ? { ...x, qty: next } : x)).filter((x) => x.qty > 0),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((x) => x._id !== id));
  }

  function updatePayRow(id: string, patch: Partial<PayRow>) {
    setPayRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addPayRow() {
    setPayRows((prev) => [...prev, newPayRow("cash", 0)]);
  }

  function removePayRow(id: string) {
    setPayRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  async function loadQuotationByNo() {
    const no = quoteLookup.trim().toUpperCase();
    if (!no) return;
    try {
      const res = await fetch(`/api/sales?quotationNo=${encodeURIComponent(no)}&status=quotation&limit=1`);
      const json = await res.json();
      const quote = json.data?.[0];
      if (!quote) {
        setMessage(locale === "bn" ? "কোটেশন পাওয়া যায়নি" : "Quotation not found");
        return;
      }
      setSourceQuotationId(String(quote._id));
      setCustomerId(quote.customerId ? String(quote.customerId) : "");
      setCustomerName(quote.customerName || "");
      setCustomerAddress(quote.customerAddress || "");
      setCustomerMobile(quote.customerMobile || "");
      setCustomerEmail(quote.customerEmail || "");
      setPfNo(quote.pfNo || quote.poNo || "");
      setRefNo(quote.referenceNo || "");
      setChallanNo(quote.challanNo || "");
      setBinNo(quote.binNo || "");
      setDiscount(Number(quote.discount || 0));
      setTax(Number(quote.tax || 0));
      setShipping(Number(quote.shipping || 0));
      setCart(
        (quote.items || []).map(
          (it: {
            productId?: string;
            name?: string;
            sku?: string;
            unit?: string;
            description?: string;
            imageUrl?: string;
            qty?: number;
            bonusQty?: number;
            unitPrice?: number;
          }) => ({
            _id: String(it.productId || `${quote._id}-${it.sku || it.name}`),
            name: it.name || "",
            sku: it.sku || "",
            unit: it.unit || "Pcs",
            sellPrice: Number(it.unitPrice || 0),
            imageUrl: it.imageUrl || "",
            description: it.description || "",
            qty: Number(it.qty || 1),
            bonusQty: Number(it.bonusQty || 0),
            saleDescription: it.description || "",
          }),
        ),
      );
      setMessage(
        locale === "bn"
          ? `কোটেশন লোড: ${quote.quotationNo}`
          : `Loaded quotation: ${quote.quotationNo}`,
      );
    } catch {
      setMessage(t("common.error"));
    }
  }

  function addToCart(p: Product) {
    const stock = Number(p.locationQty ?? 0);
    const displayName = locale === "bn" && p.nameBn ? p.nameBn : p.name;
    setCart((prev) => {
      const found = prev.find((i) => i._id === p._id);
      const nextQty = (found?.qty || 0) + 1;
      if (stock > 0 && nextQty > stock) {
        setMessage(
          locale === "bn"
            ? `স্টক অপর্যাপ্ত (${p.name}) — হাতে ${stock}`
            : `Insufficient stock for ${p.name} — available ${stock}`,
        );
        return prev;
      }
      if (found) {
        return prev.map((i) => (i._id === p._id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          ...p,
          name: displayName,
          qty: 1,
          bonusQty: 0,
          saleDescription: p.description || "",
        },
      ];
    });
  }

  function tryBarcodeAdd(raw: string) {
    const code = raw.trim();
    if (!code) return false;
    const list = productsRef.current;
    const exact =
      list.find((p) => p.sku.toLowerCase() === code.toLowerCase()) ||
      list.find((p) => p.name.toLowerCase() === code.toLowerCase());
    if (exact) {
      addToCart(exact);
      setQ("");
      setMessage(
        locale === "bn"
          ? `যোগ হয়েছে: ${exact.nameBn || exact.name}`
          : `Added: ${exact.name}`,
      );
      return true;
    }
    return false;
  }

  function resetCart() {
    setCart([]);
    setDiscount(0);
    setTax(0);
    setShipping(0);
    setPaidReceived(null);
    setPayRows([newPayRow("cash", 0)]);
    setPfNo("");
    setRefNo("");
    setChallanNo("");
    setSourceQuotationId("");
    setQuoteLookup("");
    setMessage("");
    searchRef.current?.focus();
  }

  async function checkout(opts?: {
    status?: string;
    method?: string;
    fullPay?: boolean;
    usePayRows?: boolean;
  }) {
    if (!cart.length || !locationId) {
      setMessage(
        locale === "bn"
          ? "লোকেশন ও কার্ট আইটেম প্রয়োজন"
          : "Location and cart items are required",
      );
      return;
    }
    const status = opts?.status || "final";
    const method = opts?.method || payMethod;
    setPayMethod(method);

    let payments: { method: string; amount: number }[] = [];
    if (status === "final" && opts?.usePayRows) {
      if (collectedPaid - grandTotal > 0.009) {
        setMessage(t("pos.overpayment"));
        return;
      }
      payments = payRows
        .filter((r) => Number(r.amount) > 0)
        .map((r) => ({ method: r.method, amount: Number(r.amount) }));
    } else {
      const paid =
        status !== "final" || method === "credit"
          ? 0
          : opts?.fullPay
            ? grandTotal
            : Math.min(effectivePaid, grandTotal);
      payments = paid > 0 ? [{ method, amount: paid }] : [];
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          customerId: customerId || undefined,
          customerName: customerName.trim() || selectedCustomer?.name || "Walk-in Customer",
          customerMobile: customerMobile.trim() || selectedCustomer?.mobile,
          customerAddress: customerAddress.trim() || selectedCustomer?.address,
          customerEmail: customerEmail.trim() || undefined,
          pfNo: pfNo.trim() || undefined,
          challanNo: challanNo.trim() || undefined,
          binNo: binNo.trim() || undefined,
          sourceQuotationId: status === "final" && sourceQuotationId ? sourceQuotationId : undefined,
          status,
          discount,
          tax,
          shipping,
          items: cart.map((i) => ({
            productId: i._id,
            name: (i.name || "").trim() || i.sku,
            sku: i.sku,
            unit: i.unit || "Pcs",
            qty: i.qty,
            bonusQty: i.bonusQty,
            unitPrice: i.sellPrice,
            description: i.saleDescription || "",
            imageUrl: i.imageUrl || "",
          })),
          payments,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "overpayment") throw new Error("overpayment");
        throw new Error(json.error || "fail");
      }
      resetCart();
      const docLabel =
        status === "quotation"
          ? `${json.data.quotationNo || ""} / ${json.data.referenceNo || ""}`
          : `${json.data.invoiceNo || ""} / ${json.data.referenceNo || ""}`;
      setMessage(
        locale === "bn"
          ? `সংরক্ষিত: ${docLabel}`
          : `Saved: ${docLabel}`,
      );
      await loadProducts();
      if (json.data?._id) {
        const path =
          status === "quotation"
            ? `/sales/${json.data._id}/quotation`
            : `/sales/${json.data._id}/invoice`;
        window.open(path, "_blank");
      }
    } catch (err) {
      setMessage(err instanceof Error && err.message === "overpayment" ? t("pos.overpayment") : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function addCustomer() {
    if (!newCust.name.trim() || !newCust.mobile.trim()) return;
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "customer",
          name: newCust.name.trim(),
          mobile: newCust.mobile.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error("fail");
      const created = json.data;
      setCustomers((prev) => [created, ...prev]);
      setCustomerId(String(created._id));
      setCustOpen(false);
      setNewCust({ name: "", mobile: "" });
    } catch {
      setMessage(t("common.error"));
    }
  }

  const clockLabel = `${formatDateBD(now, locale)} ${now.toLocaleTimeString(
    locale === "bn" ? "bn-BD" : "en-GB",
    { hour: "2-digit", minute: "2-digit", hour12: false },
  )}`;

  return (
    <div className="pos-page space-y-3">
      <div className="gp-card flex flex-wrap items-center gap-2 p-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">
            {t("dashboard.location")}:
          </span>
          <select
            className="gp-input max-w-xs"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {locations.length === 0 ? (
              <option value="">{locale === "bn" ? "লোকেশন নেই" : "No location"}</option>
            ) : null}
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
          <span className="rounded-lg bg-[var(--gp-primary)] px-3 py-1.5 text-sm font-semibold text-white">
            {clockLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="gp-btn gp-btn-ghost min-h-10 min-w-10 px-2"
            title={locale === "bn" ? "ক্যালকুলেটর" : "Calculator"}
            onClick={() => setCalcOpen(true)}
          >
            <Calculator className="h-4 w-4 text-[var(--gp-primary)]" />
          </button>
          <button
            type="button"
            className="gp-btn gp-btn-ghost min-h-10 min-w-10 px-2"
            title={t("pos.clear")}
            onClick={resetCart}
          >
            <X className="h-4 w-4 text-[var(--gp-danger)]" />
          </button>
          <Link href="/expenses" className="gp-btn gp-btn-ghost min-h-10 px-3 text-sm">
            <Plus className="h-4 w-4" />
            {locale === "bn" ? "খরচ" : "Add Expense"}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="gp-card flex min-h-[28rem] flex-col p-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)_auto]">
            <select
              className="gp-input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">{t("pos.customerWalkIn")}</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {(locale === "bn" && c.nameBn ? c.nameBn : c.name) +
                    (c.mobile ? ` · ${c.mobile}` : "")}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="gp-btn gp-btn-primary min-h-10 min-w-10 px-2"
              title={t("contacts.addCustomer")}
              onClick={() => setCustOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
            </button>
            <div className="relative sm:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                className="gp-input gp-input-icon-left"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tryBarcodeAdd(q);
                  }
                }}
                placeholder={t("pos.searchProduct")}
                autoComplete="off"
                autoFocus
              />
            </div>
            <button
              type="button"
              className="gp-btn gp-btn-primary min-h-10 min-w-10 px-2"
              title={t("pos.searchProduct")}
              onClick={() => tryBarcodeAdd(q)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-sm font-bold uppercase tracking-[0.06em] text-[var(--gp-ink)]">
            {t("pos.documentTitle")}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Field label={t("pos.quotationPiNo")}>
              <input
                className="gp-input"
                value={quoteLookup}
                onChange={(e) => setQuoteLookup(e.target.value.toUpperCase())}
                placeholder="NES202600001"
              />
            </Field>
            <div className="flex items-end">
              <button type="button" className="gp-btn gp-btn-ghost min-h-10 px-3" onClick={() => void loadQuotationByNo()}>
                {t("pos.loadQuotation")}
              </button>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Field label={t("pos.customerName")}>
              <input
                className="gp-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </Field>
            <Field label={t("pos.contactNo")}>
              <input
                className="gp-input"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
              />
            </Field>
            <Field label={t("contacts.address")}>
              <input
                className="gp-input"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </Field>
            <Field label={t("contacts.email")}>
              <input
                className="gp-input"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("pos.pfNo")}>
              <input className="gp-input" value={pfNo} onChange={(e) => setPfNo(e.target.value)} />
            </Field>
            <Field label={t("pos.refNo")}>
              <input className="gp-input" value={refNo} readOnly placeholder={t("pos.autoGenerated")} />
            </Field>
            <Field label={t("pos.challanNo")}>
              <input className="gp-input" value={challanNo} onChange={(e) => setChallanNo(e.target.value)} />
            </Field>
            <Field label={t("pos.binNo")}>
              <input className="gp-input" value={binNo} onChange={(e) => setBinNo(e.target.value)} />
            </Field>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>{t("pos.itemName")}</th>
                  <th>{t("pos.specification")}</th>
                  <th className="w-24">{t("pos.itemQty")}</th>
                  <th className="w-28">{t("pos.unitPrice")}</th>
                  <th className="w-28">{t("pos.totalPrice")}</th>
                  <th className="w-12">
                    <X className="mx-auto h-4 w-4" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted">
                      {t("pos.emptyCart")}
                    </td>
                  </tr>
                ) : (
                  cart.map((i) => (
                    <tr key={i._id}>
                      <td className="align-top">
                        <input
                          className="gp-input min-w-[8rem]"
                          value={i.name}
                          onChange={(e) => updateLine(i._id, { name: e.target.value })}
                        />
                        <p className="mt-1 text-[0.7rem] text-muted">SKU: {i.sku}</p>
                      </td>
                      <td className="align-top">
                        <input
                          className="gp-input min-w-[8rem]"
                          value={i.saleDescription}
                          onChange={(e) => updateLine(i._id, { saleDescription: e.target.value })}
                          placeholder={t("pos.specification")}
                        />
                      </td>
                      <td className="align-top">
                        <input
                          type="number"
                          min={1}
                          className="gp-input"
                          value={i.qty}
                          onChange={(e) =>
                            setQty(i._id, Number(e.target.value || 0), Number(i.locationQty ?? 0))
                          }
                        />
                      </td>
                      <td className="align-top">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="gp-input"
                          value={i.sellPrice}
                          onChange={(e) =>
                            updateLine(i._id, {
                              sellPrice: Math.max(0, Number(e.target.value || 0)),
                            })
                          }
                        />
                      </td>
                      <td className="align-top pt-2">
                        <span className="gp-money font-bold">
                          {formatBDT(i.qty * i.sellPrice, locale)}
                        </span>
                      </td>
                      <td className="align-top">
                        <button
                          type="button"
                          className="gp-btn gp-btn-danger min-h-9 min-w-9 px-0"
                          onClick={() => removeLine(i._id)}
                          aria-label={t("common.delete")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {t("pos.items")}: <b>{itemCount.toFixed(2)}</b>
              </span>
              <span>
                {t("common.total")}:{" "}
                <b className="gp-money">{formatBDT(subtotal, locale)}</b>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label={`${t("common.discount")} (-)`}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className="gp-input gp-input-icon-right"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value || 0))}
                  />
                  <Pencil className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gp-info)]" />
                </div>
              </Field>
              <Field label={`${t("common.tax")} (+)`}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className="gp-input gp-input-icon-right"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value || 0))}
                  />
                  <Pencil className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gp-info)]" />
                </div>
              </Field>
              <Field label={`${t("invoice.shipping")} (+)`}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className="gp-input gp-input-icon-right"
                    value={shipping}
                    onChange={(e) => setShipping(Number(e.target.value || 0))}
                  />
                  <Pencil className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gp-info)]" />
                </div>
              </Field>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                {t("pos.multiplePayment")}
              </p>
              {payRows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                  <Field label={`${t("sales.paymentMethod")} ${idx + 1}`}>
                    <select
                      className="gp-input"
                      value={row.method}
                      onChange={(e) => updatePayRow(row.id, { method: e.target.value })}
                    >
                      {PAY_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {t(`sales.${m}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("common.amount")}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="gp-input"
                      value={row.amount || ""}
                      onChange={(e) =>
                        updatePayRow(row.id, { amount: Math.max(0, Number(e.target.value || 0)) })
                      }
                    />
                  </Field>
                  <button
                    type="button"
                    className="gp-btn gp-btn-danger mb-[1px] min-h-10 min-w-10 px-0"
                    disabled={payRows.length <= 1}
                    onClick={() => removePayRow(row.id)}
                    aria-label={t("common.delete")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" className="gp-btn gp-btn-ghost min-h-10 px-3 text-sm" onClick={addPayRow}>
                <Plus className="h-4 w-4" />
                {t("pos.addPayment")}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-[#f8fafc] px-3 py-2">
                <span>
                  {t("pos.totalPayable")}:{" "}
                  <b className="gp-money">{formatBDT(grandTotal, locale)}</b>
                </span>
                <span>
                  {t("pos.totalPaid")}:{" "}
                  <b className="gp-money">{formatBDT(collectedPaid, locale)}</b>
                </span>
                <span>
                  {t("sales.paymentDue")}:{" "}
                  <b className="gp-money text-[var(--gp-danger)]">{formatBDT(remainingDue, locale)}</b>
                </span>
              </div>
              {collectedPaid - grandTotal > 0.009 ? (
                <p className="rounded-xl border border-[#f5c2c2] bg-[#fef2f2] px-3 py-2 text-sm font-semibold text-danger">
                  {t("pos.overpayment")}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`gp-btn min-h-12 ${filterOpen === "category" || categoryId ? "gp-btn-primary" : "gp-btn-ghost"}`}
              onClick={() => setFilterOpen((v) => (v === "category" ? null : "category"))}
            >
              <LayoutGrid className="h-4 w-4" />
              {t("products.category")}
            </button>
            <button
              type="button"
              className={`gp-btn min-h-12 ${filterOpen === "brand" || brandName ? "gp-btn-primary" : "gp-btn-ghost"}`}
              onClick={() => setFilterOpen((v) => (v === "brand" ? null : "brand"))}
            >
              <span className="font-bold">B</span>
              {locale === "bn" ? "ব্র্যান্ড" : "Brands"}
            </button>
          </div>
          {filterOpen === "category" ? (
            <div className="gp-card flex flex-wrap gap-1.5 p-2">
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-9 px-3 text-sm"
                onClick={() => {
                  setCategoryId("");
                  setFilterOpen(null);
                }}
              >
                {t("common.all")}
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className={`gp-btn min-h-9 px-3 text-sm ${categoryId === c._id ? "gp-btn-primary" : "gp-btn-ghost"}`}
                  onClick={() => {
                    setCategoryId(c._id);
                    setFilterOpen(null);
                  }}
                >
                  {locale === "bn" && c.nameBn ? c.nameBn : c.name}
                </button>
              ))}
            </div>
          ) : null}
          {filterOpen === "brand" ? (
            <div className="gp-card flex flex-wrap gap-1.5 p-2">
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-9 px-3 text-sm"
                onClick={() => {
                  setBrandName("");
                  setFilterOpen(null);
                }}
              >
                {t("common.all")}
              </button>
              {brands.map((b) => (
                <button
                  key={b._id}
                  type="button"
                  className={`gp-btn min-h-9 px-3 text-sm ${brandName === b.name ? "gp-btn-primary" : "gp-btn-ghost"}`}
                  onClick={() => {
                    setBrandName(b.name);
                    setFilterOpen(null);
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          ) : null}

          {loadingProducts && visibleProducts.length === 0 ? (
            <p className="rounded-xl border border-line bg-[var(--gp-surface)] px-4 py-10 text-center text-muted">
              {t("app.loading")}
            </p>
          ) : visibleProducts.length === 0 ? (
            <p className="rounded-xl border border-line bg-[var(--gp-surface)] px-4 py-10 text-center text-muted">
              {locale === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
            </p>
          ) : (
            <>
              <div
                ref={gridRef}
                className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${loadingProducts ? "opacity-60" : ""}`}
              >
                {pagedProducts.map((p) => {
                  const stock = Number(p.locationQty ?? 0);
                  const out = stock <= 0;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      data-pos-card
                      disabled={out}
                      onClick={() => addToCart(p)}
                      className="gp-card-interactive group p-3.5 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="mb-2.5 flex items-start justify-between gap-2">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-lg border border-line object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gp-primary-soft)] text-[var(--gp-primary)] transition group-hover:bg-[var(--gp-primary)] group-hover:text-white">
                            <Cpu className="h-4 w-4" />
                          </div>
                        )}
                        <span className={`gp-stock-pill ${out ? "opacity-60" : ""}`}>
                          {stock} {p.unit || "Pcs"}
                        </span>
                      </div>
                      <p className="text-[0.92rem] font-semibold leading-snug text-[var(--gp-ink)]">
                        {locale === "bn" && p.nameBn ? p.nameBn : p.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">({p.sku})</p>
                      <p className="gp-money mt-2.5 text-lg text-primary">
                        {formatBDT(p.sellPrice, locale)}
                      </p>
                    </button>
                  );
                })}
              </div>
              {productPages > 1 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: productPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`gp-btn min-h-9 min-w-9 px-2.5 text-sm ${
                        n === safeProductPage ? "gp-btn-primary" : "gp-btn-ghost"
                      }`}
                      onClick={() => setProductPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  {safeProductPage < productPages ? (
                    <button
                      type="button"
                      className="gp-btn gp-btn-ghost min-h-9 px-3 text-sm"
                      onClick={() => setProductPage((p) => Math.min(productPages, p + 1))}
                    >
                      {t("pos.next")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <div className="gp-card flex flex-wrap items-center gap-2 p-2.5">
        <button
          type="button"
          className="gp-btn gp-btn-ghost min-h-11 px-3 text-sm"
          disabled={busy || !cart.length}
          onClick={() => void checkout({ status: "draft" })}
        >
          <Pencil className="h-4 w-4 text-[var(--gp-info)]" />
          {t("sales.statusDraft")}
        </button>
        <button
          type="button"
          className="gp-btn gp-btn-ghost min-h-11 px-3 text-sm"
          disabled={busy || !cart.length}
          onClick={() => void checkout({ status: "quotation" })}
        >
          <FileText className="h-4 w-4 text-[var(--gp-warn)]" />
          {t("sales.statusQuotation")}
        </button>
        <button
          type="button"
          className="gp-btn gp-btn-ghost min-h-11 px-3 text-sm"
          disabled={busy || !cart.length}
          onClick={() => void checkout({ status: "suspended" })}
        >
          <Pause className="h-4 w-4 text-[var(--gp-danger)]" />
          {t("pos.hold")}
        </button>
        <button
          type="button"
          className="gp-btn gp-btn-ghost min-h-11 px-3 text-sm"
          disabled={busy || !cart.length}
          onClick={() => void checkout({ method: "credit" })}
        >
          <Wallet className="h-4 w-4 text-[var(--gp-primary)]" />
          {t("sales.credit")}
        </button>
        <button
          type="button"
          className="gp-btn gp-btn-ghost min-h-11 px-3 text-sm"
          disabled={busy || !cart.length}
          onClick={() => void checkout({ method: "card", fullPay: true })}
        >
          <CreditCard className="h-4 w-4 text-[#db2777]" />
          {t("sales.card")}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="gp-btn pos-multipay min-h-12 min-w-[9rem] px-4"
            disabled={busy || !cart.length || !locationId || collectedPaid - grandTotal > 0.009}
            onClick={() => void checkout({ usePayRows: true })}
          >
            <Wallet className="h-4 w-4" />
            {t("sales.multiple")}
          </button>
          <button
            type="button"
            className="gp-btn pos-cash min-h-12 min-w-[8rem] px-4"
            disabled={busy || !cart.length || !locationId}
            onClick={() => void checkout({ method: "cash", fullPay: true })}
          >
            {busy ? "..." : t("sales.cash")}
          </button>
          <button
            type="button"
            className="gp-btn pos-cancel min-h-12 min-w-[7rem] px-4"
            disabled={busy || cart.length === 0}
            onClick={resetCart}
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </button>
          <div className="px-2 text-right">
            <p className="text-xs font-semibold text-muted">
              {locale === "bn" ? "মোট প্রদেয়" : "Total Payable"}
            </p>
            <p className="gp-money text-2xl font-extrabold text-[var(--gp-primary)]">
              {formatBDT(grandTotal, locale)}
            </p>
          </div>
          <Link href="/sales" className="gp-btn gp-btn-primary min-h-12 px-4">
            <Clock className="h-4 w-4" />
            {locale === "bn" ? "সাম্প্রতিক" : "Recent Transactions"}
          </Link>
        </div>
      </div>

      {message ? (
        <p className="rounded-xl border border-line bg-[var(--gp-surface)] px-3 py-2 text-sm font-semibold text-primary">
          {message}
          {locationName ? <span className="ml-2 font-normal text-muted">· {locationName}</span> : null}
        </p>
      ) : null}

      <CalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />

      <Modal
        open={custOpen}
        title={t("contacts.addCustomer")}
        onClose={() => setCustOpen(false)}
      >
        <div className="grid gap-3">
          <Field label={t("contacts.name")}>
            <input
              className="gp-input"
              value={newCust.name}
              onChange={(e) => setNewCust((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label={t("contacts.mobile")}>
            <input
              className="gp-input"
              value={newCust.mobile}
              onChange={(e) => setNewCust((s) => ({ ...s, mobile: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setCustOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="button" className="gp-btn gp-btn-primary" onClick={() => void addCustomer()}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
