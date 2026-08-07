"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Cpu, Search } from "lucide-react";
import { PageHeader, Field } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
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
};

type Customer = {
  _id: string;
  name: string;
  nameBn?: string;
  mobile?: string;
};

type CartItem = Product & { qty: number; bonusQty: number };

export default function PosPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [message, setMessage] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef<Product[]>([]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

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
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const qs = new URLSearchParams({ limit: "120" });
      if (debouncedQ) qs.set("q", debouncedQ);
      if (locationId) qs.set("locationId", locationId);
      const res = await fetch(`/api/products?${qs}`);
      const d = await res.json();
      setProducts(d.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [debouncedQ, locationId]);

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

  const subtotal = useMemo(
    () => cart.reduce((a, i) => a + i.qty * i.sellPrice, 0),
    [cart],
  );
  const grandTotal = Math.max(0, subtotal - discount);

  const selectedCustomer = customers.find((c) => c._id === customerId);

  function addToCart(p: Product) {
    const stock = Number(p.locationQty ?? 0);
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
      return [...prev, { ...p, qty: 1, bonusQty: 0 }];
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

  async function checkout() {
    if (!cart.length || !locationId) {
      setMessage(
        locale === "bn"
          ? "লোকেশন ও কার্ট আইটেম প্রয়োজন"
          : "Location and cart items are required",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const walkIn = locale === "bn" ? "নগদ গ্রাহক" : "Walk-in Customer";
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          customerId: customerId || undefined,
          customerName: selectedCustomer
            ? locale === "bn" && selectedCustomer.nameBn
              ? selectedCustomer.nameBn
              : selectedCustomer.name
            : walkIn,
          customerMobile: selectedCustomer?.mobile,
          status: "final",
          discount,
          items: cart.map((i) => ({
            productId: i._id,
            name: locale === "bn" && i.nameBn ? i.nameBn : i.name,
            sku: i.sku,
            unit: i.unit || "Pcs",
            qty: i.qty,
            bonusQty: i.bonusQty,
            unitPrice: i.sellPrice,
          })),
          payments:
            payMethod === "credit"
              ? []
              : [{ method: payMethod, amount: grandTotal }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "fail");
      setCart([]);
      setDiscount(0);
      setMessage(
        locale === "bn"
          ? `বিক্রি সম্পন্ন: ${json.data.invoiceNo}`
          : `Sale complete: ${json.data.invoiceNo}`,
      );
      await loadProducts();
      searchRef.current?.focus();
      if (json.data?._id) {
        window.open(`/sales/${json.data._id}/invoice`, "_blank");
      }
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos-page">
      <PageHeader
        title={t("pos.title")}
        subtitle={
          locale === "en"
            ? "Sell motors, meters, kits and lab equipment quickly"
            : "মোটর, মিটার, কিট ও ল্যাব সরঞ্জাম দ্রুত বিক্রি করুন"
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        {/* Catalog column */}
        <div className="space-y-3">
          <div className="gp-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="sm:w-52 sm:shrink-0">
              <label className="mb-1 block text-[0.75rem] font-semibold text-muted">
                {t("dashboard.location")}
              </label>
              <select
                className="gp-input"
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
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[0.75rem] font-semibold text-muted">
                {t("pos.searchProduct")}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  ref={searchRef}
                  className="gp-input pl-9"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!tryBarcodeAdd(q)) {
                        // keep typed search — debounce will filter grid
                      }
                    }
                  }}
                  placeholder={t("pos.searchProduct")}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {loadingProducts && products.length === 0 ? (
            <p className="rounded-xl border border-line bg-[var(--gp-surface)] px-4 py-10 text-center text-muted">
              {t("app.loading")}
            </p>
          ) : products.length === 0 ? (
            <p className="rounded-xl border border-line bg-[var(--gp-surface)] px-4 py-10 text-center text-muted">
              {locale === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
            </p>
          ) : (
            <div
              ref={gridRef}
              className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${loadingProducts ? "opacity-60" : ""}`}
            >
              {products.map((p) => {
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
                        {stock}
                      </span>
                    </div>
                    <p className="text-[0.92rem] font-semibold leading-snug text-[var(--gp-ink)]">
                      {locale === "bn" && p.nameBn ? p.nameBn : p.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">{p.sku}</p>
                    <p className="gp-money mt-2.5 text-lg text-primary">
                      {formatBDT(p.sellPrice, locale)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales / cart panel */}
        <aside className="gp-card sticky top-20 flex h-fit max-h-[calc(100vh-6rem)] flex-col p-4 shadow-[var(--gp-shadow-md)]">
          <h2 className="gp-display text-lg font-bold tracking-tight">{t("pos.cart")}</h2>

          <Field label={t("sales.customer")} className="mt-3">
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
          </Field>

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-0.5">
            {cart.length === 0 ? (
              <p className="rounded-xl bg-[var(--gp-bg)] px-3 py-8 text-center text-sm text-muted">
                {t("pos.emptyCart")}
              </p>
            ) : (
              cart.map((i) => (
                <div
                  key={i._id}
                  className="rounded-xl border border-line bg-[var(--gp-bg)]/60 p-3"
                >
                  <p className="text-sm font-semibold leading-snug">
                    {locale === "bn" && i.nameBn ? i.nameBn : i.name}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="gp-btn gp-btn-ghost min-h-9 min-w-9 px-0"
                      aria-label="Decrease"
                      onClick={() =>
                        setCart((prev) =>
                          prev
                            .map((x) => (x._id === i._id ? { ...x, qty: x.qty - 1 } : x))
                            .filter((x) => x.qty > 0),
                        )
                      }
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-base font-bold">{i.qty}</span>
                    <button
                      type="button"
                      className="gp-btn gp-btn-ghost min-h-9 min-w-9 px-0"
                      aria-label="Increase"
                      onClick={() => addToCart(i)}
                    >
                      +
                    </button>
                    <span className="ml-auto gp-money text-sm font-semibold text-[var(--gp-ink)]">
                      {formatBDT(i.qty * i.sellPrice, locale)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 space-y-3 border-t border-line pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("common.discount")}>
                <input
                  type="number"
                  min={0}
                  className="gp-input"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value || 0))}
                />
              </Field>
              <Field label={t("sales.paymentMethod")}>
                <select
                  className="gp-input"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="cash">{t("sales.cash")}</option>
                  <option value="bkash">{t("sales.bkash")}</option>
                  <option value="nagad">{t("sales.nagad")}</option>
                  <option value="rocket">{t("sales.rocket")}</option>
                  <option value="card">{t("sales.card")}</option>
                  <option value="cheque">{t("sales.cheque")}</option>
                  <option value="credit">{t("sales.credit")}</option>
                </select>
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[var(--gp-primary-soft)] px-3 py-2.5">
              <span className="text-sm font-semibold text-muted">{t("common.grandTotal")}</span>
              <span className="gp-money text-xl font-bold text-primary">
                {formatBDT(grandTotal, locale)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="gp-btn gp-btn-ghost"
                disabled={busy || cart.length === 0}
                onClick={() => {
                  setCart([]);
                  setDiscount(0);
                  setMessage("");
                  searchRef.current?.focus();
                }}
              >
                {t("pos.clear")}
              </button>
              <button
                type="button"
                className="gp-btn gp-btn-primary"
                disabled={busy || !cart.length || !locationId}
                onClick={checkout}
              >
                {busy ? "..." : t("pos.pay")}
              </button>
            </div>

            {message ? (
              <p className="rounded-xl bg-[var(--gp-bg)] px-3 py-2 text-sm font-semibold text-primary">
                {message}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
