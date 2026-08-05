"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AlertBanner, EmptyState, Field, Modal, PageHeader, TableSkeleton } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { displaySupplierLabel } from "@/lib/supplier-label";
import { useDebouncedValue } from "@/lib/hooks";

type SupplierOffer = {
  supplierId?: string;
  name: string;
  nameBn?: string;
  price: number;
  linkId?: string;
};

type CatalogSupplier = {
  _id: string;
  name: string;
  nameBn?: string;
};

type Product = {
  _id: string;
  name: string;
  nameBn?: string;
  sku: string;
  brand?: string;
  purchasePrice?: number;
  sellPrice: number;
  alertQty?: number;
  locationQty?: number;
  supplierOffers?: SupplierOffer[];
};

type OfferSlot = {
  supplierId: string;
  price: string;
};

const EMPTY_SLOTS: OfferSlot[] = [
  { supplierId: "", price: "" },
  { supplierId: "", price: "" },
  { supplierId: "", price: "" },
  { supplierId: "", price: "" },
];

function relationOffers(p: Product): SupplierOffer[] {
  return (p.supplierOffers || []).filter((o) => o?.supplierId).slice(0, 4);
}

function apiErrorMessage(
  code: string | undefined,
  locale: string,
): string {
  if (code === "duplicate_sku") {
    return locale === "bn"
      ? "এই SKU ইতিমধ্যে ব্যবহার হচ্ছে — অন্য SKU দিন"
      : "This SKU already exists — use a different code";
  }
  if (code === "missing_name") {
    return locale === "bn" ? "পণ্যের নাম লিখুন" : "Product name is required";
  }
  return locale === "bn" ? "সংরক্ষণ ব্যর্থ হয়েছে" : "Could not save — please try again";
}

export default function ProductsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<CatalogSupplier[]>([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    nameBn: "",
    sku: "",
    brand: "",
    purchasePrice: "",
    sellPrice: "",
    alertQty: "10",
    openingQty: "0",
  });
  const [slots, setSlots] = useState<OfferSlot[]>(EMPTY_SLOTS);

  useEffect(() => {
    fetch("/api/contacts?type=supplier&limit=200")
      .then((r) => r.json())
      .then((d) => setCatalog(d.data || []))
      .catch(() => setCatalog([]));
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: "100" });
    if (debouncedQ) qs.set("q", debouncedQ);
    try {
      const res = await fetch(`/api/products?${qs}`);
      const json = await res.json();
      setProducts(json.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      nameBn: "",
      sku: "",
      brand: "",
      purchasePrice: "",
      sellPrice: "",
      alertQty: "10",
      openingQty: "0",
    });
    setSlots([
      { supplierId: catalog[0]?._id || "", price: "" },
      { supplierId: catalog[1]?._id || "", price: "" },
      { supplierId: catalog[2]?._id || "", price: "" },
      { supplierId: "", price: "" },
    ]);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    const offers = relationOffers(p);
    setEditing(p);
    setForm({
      name: p.name || "",
      nameBn: p.nameBn || "",
      sku: p.sku || "",
      brand: p.brand || "",
      purchasePrice: String(p.purchasePrice ?? ""),
      sellPrice: String(p.sellPrice ?? ""),
      alertQty: String(p.alertQty ?? 10),
      openingQty: "0",
    });
    setSlots([
      {
        supplierId: offers[0]?.supplierId || "",
        price: offers[0] ? String(offers[0].price) : "",
      },
      {
        supplierId: offers[1]?.supplierId || "",
        price: offers[1] ? String(offers[1].price) : "",
      },
      {
        supplierId: offers[2]?.supplierId || "",
        price: offers[2] ? String(offers[2].price) : "",
      },
      {
        supplierId: offers[3]?.supplierId || "",
        price: offers[3] ? String(offers[3].price) : "",
      },
    ]);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBanner(null);

    const seen = new Set<string>();
    const supplierOffers = slots
      .filter((s) => s.supplierId)
      .map((s) => ({
        supplierId: s.supplierId,
        price: Number(s.price || 0),
      }))
      .filter((s) => {
        if (seen.has(s.supplierId)) return false;
        seen.add(s.supplierId);
        return true;
      });

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      nameBn: form.nameBn.trim(),
      sku: form.sku.trim(),
      brand: form.brand.trim(),
      purchasePrice: Number(form.purchasePrice || 0),
      sellPrice: Number(form.sellPrice || 0),
      alertQty: Number(form.alertQty || 10),
      supplierOffers,
    };

    if (!editing) {
      payload.openingQty = Number(form.openingQty || 0);
    }

    try {
      const res = await fetch(
        editing ? `/api/products/${editing._id}` : "/api/products",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          tone: "error",
          message: apiErrorMessage(json.error, locale),
        });
        return;
      }
      setModalOpen(false);
      setBanner({
        tone: "success",
        message:
          locale === "bn"
            ? editing
              ? "পণ্য আপডেট হয়েছে"
              : `পণ্য যোগ হয়েছে (${json.data?.sku || form.sku})`
            : editing
              ? "Product updated"
              : `Product added (${json.data?.sku || form.sku})`,
      });
      await loadProducts();
    } catch {
      setBanner({ tone: "error", message: t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(locale === "bn" ? "পণ্য মুছবেন?" : "Delete this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setBanner({ tone: "error", message: t("common.error") });
      return;
    }
    setBanner({
      tone: "success",
      message: locale === "bn" ? "পণ্য মুছে ফেলা হয়েছে" : "Product deleted",
    });
    await loadProducts();
  }

  function updateSlot(index: number, patch: Partial<OfferSlot>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <div>
      <PageHeader
        title={t("products.title")}
        subtitle={
          locale === "en"
            ? "Product list with linked supplier prices"
            : "পণ্য তালিকা — লিংকড সরবরাহকারী মূল্যসহ"
        }
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("products.add")}
          </button>
        }
      />

      {banner ? (
        <AlertBanner tone={banner.tone} message={banner.message} onClose={() => setBanner(null)} />
      ) : null}

      <div className="gp-card mb-5 flex items-center gap-3 p-3.5">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          className="gp-input border-0 bg-transparent shadow-none focus:shadow-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("products.searchWide")}
          aria-label={t("common.search")}
        />
        {loading && q ? (
          <span className="shrink-0 text-xs text-muted">{t("common.loading")}</span>
        ) : null}
      </div>

      {loading && !products.length ? (
        <TableSkeleton rows={8} cols={7} />
      ) : products.length === 0 ? (
        <EmptyState message={debouncedQ ? (locale === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products match your search") : t("common.noData")} />
      ) : (
        <div className="gp-table-wrap overflow-x-auto">
          <table className="gp-table gp-product-list">
            <thead>
              <tr>
                <th>{t("products.name")}</th>
                <th>{t("products.sku")}</th>
                <th>{t("products.brand")}</th>
                <th>{t("products.purchasePrice")}</th>
                <th>{t("products.sellPrice")}</th>
                <th>{t("products.supplierPrices")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className={loading ? "opacity-60" : undefined}>
              {products.map((p) => {
                const title = locale === "bn" && p.nameBn ? p.nameBn : p.name;
                const offers = relationOffers(p);
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="font-semibold text-[var(--gp-ink)]">{title}</div>
                      {locale === "bn" && p.name && p.nameBn ? (
                        <div className="mt-0.5 text-xs text-muted">{p.name}</div>
                      ) : null}
                    </td>
                    <td className="gp-money whitespace-nowrap">{p.sku}</td>
                    <td className="text-muted">{p.brand || "—"}</td>
                    <td className="gp-money whitespace-nowrap">
                      {formatBDT(p.purchasePrice || 0, locale)}
                    </td>
                    <td className="gp-money whitespace-nowrap">
                      {formatBDT(p.sellPrice || 0, locale)}
                    </td>
                    <td>
                      {offers.length === 0 ? (
                        <span className="text-sm text-muted">{t("products.noSuppliers")}</span>
                      ) : (
                        <div className="gp-product-list__suppliers">
                          {offers.map((offer, idx) => (
                            <Link
                              key={offer.linkId || `${p._id}-${offer.supplierId}-${idx}`}
                              href={`/contacts/suppliers/${offer.supplierId}`}
                              className="gp-product-list__chip"
                              title={locale === "bn" ? "সরবরাহকারী দেখুন" : "View supplier"}
                            >
                              <span className="gp-product-list__chip-name">
                                {displaySupplierLabel(offer, locale)}
                              </span>
                              <span className="gp-product-list__chip-price gp-money">
                                {formatBDT(offer.price, locale)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5 text-[var(--gp-danger)]"
                          onClick={() => onDelete(p._id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? t("common.edit") : t("products.add")}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label={t("products.name")}>
            <input
              className="gp-input"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "নাম (বাংলা)" : "Name (Bangla)"}>
            <input
              className="gp-input"
              value={form.nameBn}
              onChange={(e) => setForm((f) => ({ ...f, nameBn: e.target.value }))}
            />
          </Field>
          <Field label={t("products.sku")}>
            <input
              className="gp-input"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder={locale === "bn" ? "খালি রাখলে অটো তৈরি হবে" : "Leave blank to auto-generate"}
            />
          </Field>
          <Field label={t("products.brand")}>
            <input
              className="gp-input"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
          </Field>
          <Field label={t("products.purchasePrice")}>
            <input
              type="number"
              min={0}
              step="0.01"
              className="gp-input"
              value={form.purchasePrice}
              onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
            />
          </Field>
          <Field label={t("products.sellPrice")}>
            <input
              type="number"
              min={0}
              step="0.01"
              className="gp-input"
              value={form.sellPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
            />
          </Field>
          {!editing ? (
            <Field label={locale === "bn" ? "প্রারম্ভিক স্টক" : "Opening stock"}>
              <input
                type="number"
                min={0}
                className="gp-input"
                value={form.openingQty}
                onChange={(e) => setForm((f) => ({ ...f, openingQty: e.target.value }))}
              />
            </Field>
          ) : null}

          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-semibold text-muted">{t("products.supplierPrices")}</p>
            <p className="mb-3 text-xs text-muted">{t("products.supplierHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {slots.map((slot, n) => (
                <div key={n} className="rounded-xl border border-line bg-[var(--gp-bg)] p-3">
                  <Field label={`${t("contacts.suppliers")} ${n + 1}`}>
                    <select
                      className="gp-input"
                      value={slot.supplierId}
                      onChange={(e) => updateSlot(n, { supplierId: e.target.value })}
                    >
                      <option value="">{t("products.selectSupplier")}</option>
                      {catalog.map((s) => (
                        <option key={s._id} value={s._id}>
                          {displaySupplierLabel(s, locale)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="mt-2">
                    <Field label={t("products.price")}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="gp-input"
                        value={slot.price}
                        onChange={(e) => updateSlot(n, { price: e.target.value })}
                        disabled={!slot.supplierId}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="gp-btn gp-btn-ghost"
              onClick={() => setModalOpen(false)}
              disabled={busy}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>
              {busy ? t("app.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
