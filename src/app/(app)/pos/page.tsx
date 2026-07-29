"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Cpu } from "lucide-react";
import { PageHeader, Field } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { animateStagger } from "@/lib/gsap";

type Product = {
  _id: string;
  name: string;
  nameBn?: string;
  sku: string;
  sellPrice: number;
  unit?: string;
  locationQty?: number;
};

type CartItem = Product & { qty: number; bonusQty: number };

export default function PosPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        setLocations(d.locations || []);
        if (d.locations?.[0]?._id) setLocationId(d.locations[0]._id);
      });
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({ limit: "100" });
    if (q) qs.set("q", q);
    if (locationId) qs.set("locationId", locationId);
    fetch(`/api/products?${qs}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.data || []));
  }, [q, locationId]);

  useEffect(() => {
    if (!gridRef.current || !products.length) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-pos-card]");
    animateStagger(cards, { y: 12, stagger: 0.03 });
  }, [products]);

  const subtotal = useMemo(
    () => cart.reduce((a, i) => a + i.qty * i.sellPrice, 0),
    [cart],
  );
  const grandTotal = Math.max(0, subtotal - discount);

  function addToCart(p: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i._id === p._id);
      if (found) {
        return prev.map((i) => (i._id === p._id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...p, qty: 1, bonusQty: 0 }];
    });
  }

  async function checkout() {
    if (!cart.length || !locationId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          customerName: customerName || (locale === "bn" ? "নগদ গ্রাহক" : "Walk-in Customer"),
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
      if (!res.ok) throw new Error("fail");
      setCart([]);
      setDiscount(0);
      setMessage(
        locale === "bn"
          ? `বিক্রি সম্পন্ন: ${json.data.invoiceNo}`
          : `Sale complete: ${json.data.invoiceNo}`,
      );
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
    <div>
      <PageHeader
        title={t("pos.title")}
        subtitle={
          locale === "en"
            ? "Sell motors, meters, kits and lab equipment quickly"
            : "মোটর, মিটার, কিট ও ল্যাব সরঞ্জাম দ্রুত বিক্রি করুন"
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="gp-card grid gap-3 p-4 md:grid-cols-2">
            <Field label={t("dashboard.location")}>
              <select className="gp-input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("pos.searchProduct")}>
              <input
                className="gp-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("pos.searchProduct")}
              />
            </Field>
          </div>

          <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <button
                key={p._id}
                type="button"
                data-pos-card
                onClick={() => addToCart(p)}
                className="gp-card-interactive group p-4 text-left"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gp-primary-soft)] text-[var(--gp-primary)] transition group-hover:bg-[var(--gp-primary)] group-hover:text-white">
                  <Cpu className="h-4 w-4" />
                </div>
                <p className="text-[0.95rem] font-semibold leading-snug text-[var(--gp-ink)]">
                  {locale === "bn" && p.nameBn ? p.nameBn : p.name}
                </p>
                <p className="mt-1 text-xs text-muted">{p.sku}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="gp-money text-lg text-primary">
                    {formatBDT(p.sellPrice, locale)}
                  </span>
                  <span className="gp-stock-pill">{p.locationQty ?? 0}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="gp-card sticky top-24 h-fit p-5">
          <h2 className="gp-display text-xl font-bold">{t("pos.cart")}</h2>
          <Field label={t("sales.customer")}>
            <input
              className="gp-input mt-3"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("pos.customerWalkIn")}
            />
          </Field>

          <div className="mt-4 max-h-72 space-y-2 overflow-auto">
            {cart.length === 0 ? (
              <p className="rounded-xl bg-[var(--gp-bg)] px-3 py-8 text-center text-muted">
                {t("pos.emptyCart")}
              </p>
            ) : (
              cart.map((i) => (
                <div key={i._id} className="rounded-xl border border-line bg-[var(--gp-bg)]/50 p-3">
                  <p className="text-sm font-semibold">
                    {locale === "bn" && i.nameBn ? i.nameBn : i.name}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="gp-btn gp-btn-ghost min-h-9 px-3"
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
                      className="gp-btn gp-btn-ghost min-h-9 px-3"
                      onClick={() =>
                        setCart((prev) =>
                          prev.map((x) => (x._id === i._id ? { ...x, qty: x.qty + 1 } : x)),
                        )
                      }
                    >
                      +
                    </button>
                    <span className="ml-auto gp-money text-sm text-[var(--gp-ink)]">
                      {formatBDT(i.qty * i.sellPrice, locale)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <Field label={t("common.discount")}>
              <input
                type="number"
                className="gp-input"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value || 0))}
              />
            </Field>
            <Field label={t("sales.paymentMethod")}>
              <select className="gp-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">{t("sales.cash")}</option>
                <option value="bkash">{t("sales.bkash")}</option>
                <option value="nagad">{t("sales.nagad")}</option>
                <option value="rocket">{t("sales.rocket")}</option>
                <option value="card">{t("sales.card")}</option>
                <option value="cheque">{t("sales.cheque")}</option>
                <option value="credit">{t("sales.credit")}</option>
              </select>
            </Field>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>{t("common.grandTotal")}</span>
              <span className="gp-money text-lg text-primary">{formatBDT(grandTotal, locale)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setCart([])}>
                {t("pos.clear")}
              </button>
              <button
                type="button"
                className="gp-btn gp-btn-primary"
                disabled={busy || !cart.length}
                onClick={checkout}
              >
                {t("pos.pay")}
              </button>
            </div>
            {message ? (
              <p className="rounded-xl bg-[var(--gp-primary-soft)] px-3 py-2 text-sm font-semibold text-primary">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
