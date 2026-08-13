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
};

type CartItem = Product & { qty: number; bonusQty: number; saleDescription: string };

type Named = { _id: string; name: string; nameBn?: string };

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
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [filterOpen, setFilterOpen] = useState<"category" | "brand" | null>(null);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState("cash");
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
  }, [products]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const visibleProducts = useMemo(() => {
    if (!brandName) return products;
    return products.filter((p) => (p.brand || "") === brandName);
  }, [products, brandName]);

  const subtotal = useMemo(
    () => cart.reduce((a, i) => a + i.qty * i.sellPrice, 0),
    [cart],
  );
  const itemCount = useMemo(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);
  const grandTotal = Math.max(0, subtotal - discount + tax + shipping);
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
    setMessage("");
    searchRef.current?.focus();
  }

  async function checkout(opts?: {
    status?: string;
    method?: string;
    fullPay?: boolean;
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
    setBusy(true);
    setMessage("");
    try {
      const paid =
        status !== "final" || method === "credit"
          ? 0
          : opts?.fullPay
            ? grandTotal
            : Math.min(effectivePaid, grandTotal);
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          customerId: customerId || undefined,
          customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
          customerMobile: selectedCustomer?.mobile,
          customerAddress: selectedCustomer?.address,
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
          payments: paid > 0 ? [{ method, amount: paid }] : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "fail");
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
    } catch {
      setMessage(t("common.error"));
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
                className="gp-input pl-9"
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

          <div className="mt-3 min-h-0 flex-1 overflow-auto">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>{t("products.name")}</th>
                  <th className="w-28">{t("common.quantity")}</th>
                  <th className="w-32">{t("common.subtotal")}</th>
                  <th className="w-12">
                    <X className="mx-auto h-4 w-4" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted">
                      {t("pos.emptyCart")}
                      <span className="mt-2 block text-sm font-semibold text-[var(--gp-ink)]">
                        Product Name · Price · Description
                      </span>
                    </td>
                  </tr>
                ) : (
                  cart.map((i) => (
                    <tr key={i._id}>
                      <td className="align-top">
                        <div className="min-w-[16rem] space-y-1.5 py-1">
                          <Field label={t("pos.saleName")}>
                            <input
                              className="gp-input"
                              value={i.name}
                              onChange={(e) => updateLine(i._id, { name: e.target.value })}
                            />
                          </Field>
                          <Field label={t("pos.salePrice")}>
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
                          </Field>
                          <Field label={t("pos.saleDescription")}>
                            <input
                              className="gp-input"
                              value={i.saleDescription}
                              onChange={(e) =>
                                updateLine(i._id, { saleDescription: e.target.value })
                              }
                              placeholder={t("pos.saleDescription")}
                            />
                          </Field>
                          <p className="text-[0.7rem] text-muted">SKU: {i.sku}</p>
                        </div>
                      </td>
                      <td className="align-top">
                        <Field label={t("common.quantity")}>
                          <input
                            type="number"
                            min={1}
                            className="gp-input"
                            value={i.qty}
                            onChange={(e) =>
                              setQty(i._id, Number(e.target.value || 0), Number(i.locationQty ?? 0))
                            }
                          />
                        </Field>
                      </td>
                      <td className="align-top pt-7">
                        <span className="gp-money font-bold">
                          {formatBDT(i.qty * i.sellPrice, locale)}
                        </span>
                      </td>
                      <td className="align-top pt-6">
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
                    className="gp-input pr-8"
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
                    className="gp-input pr-8"
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
                    className="gp-input pr-8"
                    value={shipping}
                    onChange={(e) => setShipping(Number(e.target.value || 0))}
                  />
                  <Pencil className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gp-info)]" />
                </div>
              </Field>
            </div>
            <Field label={t("pos.amountReceived")}>
              <input
                type="number"
                min={0}
                step="0.01"
                className="gp-input"
                disabled={payMethod === "credit"}
                value={payMethod === "credit" ? 0 : paidReceived ?? grandTotal}
                onChange={(e) => setPaidReceived(Number(e.target.value || 0))}
              />
            </Field>
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
            <div
              ref={gridRef}
              className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${loadingProducts ? "opacity-60" : ""}`}
            >
              {visibleProducts.map((p) => {
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
            disabled={busy || !cart.length || !locationId}
            onClick={() => void checkout({ method: payMethod === "credit" ? "cash" : payMethod })}
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
