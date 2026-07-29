"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { displaySupplierLabel } from "@/lib/supplier-label";

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

export default function ProductsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<CatalogSupplier[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nameBn: "",
    sku: "",
    brand: "",
    purchasePrice: "",
    sellPrice: "",
    alertQty: "10",
  });
  const [slots, setSlots] = useState<OfferSlot[]>(EMPTY_SLOTS);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: "100" });
    if (q) qs.set("q", q);
    const [productsRes, suppliersRes] = await Promise.all([
      fetch(`/api/products?${qs}`),
      fetch("/api/contacts?type=supplier&limit=100"),
    ]);
    const productsJson = await productsRes.json();
    const suppliersJson = await suppliersRes.json();
    setProducts(productsJson.data || []);
    setCatalog(suppliersJson.data || []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

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

    const payload = {
      name: form.name,
      nameBn: form.nameBn,
      sku: form.sku,
      brand: form.brand,
      purchasePrice: Number(form.purchasePrice || 0),
      sellPrice: Number(form.sellPrice || 0),
      alertQty: Number(form.alertQty || 10),
      supplierOffers,
    };

    try {
      const res = await fetch(
        editing ? `/api/products/${editing._id}` : "/api/products",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("fail");
      setModalOpen(false);
      await load();
    } catch {
      alert(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(locale === "bn" ? "পণ্য মুছবেন?" : "Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await load();
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

      <div className="gp-card mb-5 flex items-center gap-3 p-3.5">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          className="gp-input border-0 bg-transparent shadow-none focus:shadow-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("products.searchWide")}
        />
      </div>

      {loading ? (
        <EmptyState message={t("app.loading")} />
      ) : products.length === 0 ? (
        <EmptyState message={t("common.noData")} />
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
            <tbody>
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
                              title={
                                locale === "bn"
                                  ? "সরবরাহকারী দেখুন"
                                  : "View supplier"
                              }
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
              required
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
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
              className="gp-input"
              value={form.purchasePrice}
              onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
            />
          </Field>
          <Field label={t("products.sellPrice")}>
            <input
              type="number"
              className="gp-input"
              value={form.sellPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
            />
          </Field>

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
