"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AlertBanner, EmptyState, Field, Modal, PageHeader, TableSkeleton } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
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
  currency?: string;
  alertQty?: number;
  locationQty?: number;
  imageUrl?: string;
  incomeAccountId?: string;
  expenseAccountId?: string;
  stockMethod?: string;
  description?: string;
  warrantyMonths?: number;
  serialNo?: string;
  supplierOffers?: SupplierOffer[];
};

type LedgerAcc = { _id: string; code: string; name: string; nameBn?: string; type: string };

type OfferSlot = {
  supplierId: string;
  price: string;
};

function relationOffers(p: Product): SupplierOffer[] {
  return (p.supplierOffers || []).filter((o) => o?.supplierId);
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
    currency: "BDT",
    alertQty: "10",
    openingQty: "0",
    imageUrl: "",
    incomeAccountId: "",
    expenseAccountId: "",
    stockMethod: "",
    description: "",
    warrantyMonths: "0",
    serialNo: "",
  });
  const [slots, setSlots] = useState<OfferSlot[]>([{ supplierId: "", price: "" }]);
  const [incomeAccounts, setIncomeAccounts] = useState<LedgerAcc[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<LedgerAcc[]>([]);

  useEffect(() => {
    fetch("/api/contacts?type=supplier&limit=200")
      .then((r) => r.json())
      .then((d) => setCatalog(d.data || []))
      .catch(() => setCatalog([]));
    Promise.all([
      fetch("/api/ledger-accounts?type=income").then((r) => r.json()),
      fetch("/api/ledger-accounts?type=expense").then((r) => r.json()),
    ])
      .then(([inc, exp]) => {
        setIncomeAccounts(inc.data || []);
        setExpenseAccounts(exp.data || []);
      })
      .catch(() => {
        setIncomeAccounts([]);
        setExpenseAccounts([]);
      });
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
      currency: "BDT",
      alertQty: "10",
      openingQty: "0",
      imageUrl: "",
      incomeAccountId: "",
      expenseAccountId: "",
      stockMethod: "",
      description: "",
      warrantyMonths: "0",
      serialNo: "",
    });
    setSlots([{ supplierId: "", price: "" }]);
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
      currency: p.currency || "BDT",
      alertQty: String(p.alertQty ?? 10),
      openingQty: "0",
      imageUrl: p.imageUrl || "",
      incomeAccountId: p.incomeAccountId ? String(p.incomeAccountId) : "",
      expenseAccountId: p.expenseAccountId ? String(p.expenseAccountId) : "",
      stockMethod: p.stockMethod || "",
      description: p.description || "",
      warrantyMonths: String(p.warrantyMonths ?? 0),
      serialNo: p.serialNo || "",
    });
    setSlots(
      offers.length
        ? offers.map((o) => ({
            supplierId: o.supplierId || "",
            price: String(o.price ?? ""),
          }))
        : [{ supplierId: "", price: "" }],
    );
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
      currency: form.currency || "BDT",
      alertQty: Number(form.alertQty || 10),
      imageUrl: form.imageUrl || "",
      incomeAccountId: form.incomeAccountId || null,
      expenseAccountId: form.expenseAccountId || null,
      stockMethod: form.stockMethod || "",
      description: form.description.trim(),
      warrantyMonths: Number(form.warrantyMonths || 0),
      serialNo: form.serialNo.trim(),
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

  function addSlot() {
    setSlots((prev) => [...prev, { supplierId: "", price: "" }]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => {
      if (prev.length <= 1) return [{ supplierId: "", price: "" }];
      return prev.filter((_, i) => i !== index);
    });
  }

  function onImagePick(file: File | undefined) {
    if (!file) return;
    if (file.size > 800_000) {
      setBanner({
        tone: "error",
        message:
          locale === "bn" ? "ছবি ৮০০KB এর কম হতে হবে" : "Image must be under 800KB",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="[&>div:first-child]:mb-2 [&>div:first-child]:pb-2">
      <PageHeader
        title={t("products.title")}
        subtitle={
          locale === "en"
            ? "Product list with linked supplier prices"
            : "পণ্য তালিকা — লিংকড সরবরাহকারী মূল্যসহ"
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/products/categories" className="gp-btn gp-btn-ghost">
              {t("nav.categories")}
            </Link>
            <button type="button" className="gp-btn gp-btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("products.add")}
            </button>
          </div>
        }
      />

      {banner ? (
        <AlertBanner tone={banner.tone} message={banner.message} onClose={() => setBanner(null)} />
      ) : null}

      <div className="gp-card mb-2 flex items-center gap-2 px-2 py-1.5">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          className="gp-input min-h-8 border-0 bg-transparent py-1 shadow-none focus:shadow-none"
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
        <TableSkeleton rows={8} cols={10} />
      ) : products.length === 0 ? (
        <EmptyState message={debouncedQ ? (locale === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products match your search") : t("common.noData")} />
      ) : (
        <div className="gp-table-wrap overflow-x-auto lg:-ml-12 lg:w-[calc(100%+3rem)]">
          <table className="gp-table gp-product-list min-w-[980px] lg:w-full lg:min-w-0 lg:table-fixed lg:[&_td]:py-1 lg:[&_th]:py-1.5">
            <colgroup>
              <col className="lg:w-10" />
              <col className="lg:w-12" />
              <col className="lg:w-[11.25rem]" />
              <col className="lg:w-[8.4375rem]" />
              <col className="lg:w-[4.375rem]" />
              <col className="lg:w-[5.625rem]" />
              <col className="lg:w-[5.9375rem]" />
              <col className="lg:w-[9.0625rem]" />
              <col className="lg:w-[5.625rem]" />
              <col className="lg:w-[4.75rem]" />
            </colgroup>
            <thead>
              <tr>
                <th className="w-10">SL</th>
                <th className="w-12">Image</th>
                <th>{t("products.name")}</th>
                <th>{t("products.brand")}</th>
                <th>{t("products.sku")}</th>
                <th>{locale === "bn" ? "খরচ মূল্য" : "Cost"}</th>
                <th>{locale === "bn" ? "বিক্রয় মূল্য" : "Sales price"}</th>
                <th>{t("products.supplierPrices")}</th>
                <th>{locale === "bn" ? "বিবরণ" : "Description"}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className={loading ? "opacity-60" : undefined}>
              {products.map((p, index) => {
                const title = locale === "bn" && p.nameBn ? p.nameBn : p.name;
                const offers = relationOffers(p);
                return (
                  <tr key={p._id}>
                    <td>{index + 1}</td>
                    <td>
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-7 w-7 rounded-md border border-line object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-[var(--gp-bg)]">
                          <ImageIcon className="h-3.5 w-3.5 text-muted" />
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="max-w-[13rem] truncate font-semibold text-[var(--gp-ink)]" title={title}>{title}</div>
                      {locale === "bn" && p.name && p.nameBn ? (
                        <div className="max-w-[13rem] truncate text-xs text-muted">{p.name}</div>
                      ) : null}
                    </td>
                    <td><span className="block max-w-[10rem] truncate" title={p.brand || ""}>{p.brand || "—"}</span></td>
                    <td className="gp-money whitespace-nowrap">{p.sku}</td>
                    <td className="gp-money whitespace-nowrap">
                      {formatMoney(p.purchasePrice || 0, p.currency || "BDT", locale)}
                    </td>
                    <td className="gp-money whitespace-nowrap">
                      {formatMoney(p.sellPrice || 0, p.currency || "BDT", locale)}
                    </td>
                    <td>
                      {offers.length === 0 ? (
                        <span className="text-sm text-muted">{t("products.noSuppliers")}</span>
                      ) : (
                        <details>
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap text-sm font-medium text-primary">
                            {offers.length} {locale === "bn" ? "লিংকড সরবরাহকারী" : "Linked Suppliers"}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </summary>
                          <div className="mt-1 space-y-1">
                            {offers.map((offer, idx) => (
                              <Link key={offer.linkId || `${p._id}-${offer.supplierId}-${idx}`} href={`/contacts/suppliers/${offer.supplierId}`} className="flex max-w-[13rem] items-center justify-between gap-2 text-xs text-primary hover:underline">
                                <span className="truncate">{displaySupplierLabel(offer, locale)}</span>
                                <span className="gp-money shrink-0">{formatMoney(offer.price, p.currency || "BDT", locale)}</span>
                              </Link>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                    <td><span className="block max-w-[12rem] truncate text-muted" title={p.description || ""}>{p.description || "—"}</span></td>
                    <td>
                      <div className="flex flex-nowrap gap-1">
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5 lg:min-h-7 lg:min-w-7 lg:px-1.5"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4 shrink-0" />
                        </button>
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5 text-[var(--gp-danger)] lg:min-h-7 lg:min-w-7 lg:px-1.5"
                          onClick={() => onDelete(p._id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
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
          <Field label={locale === "bn" ? "মুদ্রা (Currency)" : "Currency"}>
            <select
              className="gp-input"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <option value="BDT">BDT (৳ / Tk) — default</option>
              <option value="USD">USD ($)</option>
              <option value="RMB">RMB (¥)</option>
            </select>
          </Field>
          <Field
            label={
              locale === "bn"
                ? `খরচ মূল্য (${form.currency || "BDT"})`
                : `Cost price (${form.currency || "BDT"})`
            }
          >
            <input
              type="number"
              min={0}
              step="0.01"
              className="gp-input"
              value={form.purchasePrice}
              onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
            />
          </Field>
          <Field
            label={
              locale === "bn"
                ? `বিক্রয় মূল্য (${form.currency || "BDT"})`
                : `Sales price (${form.currency || "BDT"})`
            }
          >
            <input
              type="number"
              min={0}
              step="0.01"
              className="gp-input"
              value={form.sellPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "ওয়ারেন্টি (মাস)" : "Warranty (months)"}>
            <input
              type="number"
              min={0}
              className="gp-input"
              value={form.warrantyMonths}
              onChange={(e) => setForm((f) => ({ ...f, warrantyMonths: e.target.value }))}
              placeholder="0"
            />
          </Field>
          <Field label={locale === "bn" ? "এসএল নং (SL No)" : "SL No / Serial"}>
            <input
              className="gp-input"
              value={form.serialNo}
              onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))}
              placeholder={locale === "bn" ? "সিরিয়াল নম্বর" : "Serial number"}
            />
          </Field>
          <Field label={locale === "bn" ? "আয় হিসাব (Income)" : "Income account"}>
            <select
              className="gp-input"
              value={form.incomeAccountId}
              onChange={(e) => setForm((f) => ({ ...f, incomeAccountId: e.target.value }))}
            >
              <option value="">—</option>
              {incomeAccounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.code} — {locale === "bn" && a.nameBn ? a.nameBn : a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={locale === "bn" ? "ব্যয় হিসাব (Expense)" : "Expense account"}>
            <select
              className="gp-input"
              value={form.expenseAccountId}
              onChange={(e) => setForm((f) => ({ ...f, expenseAccountId: e.target.value }))}
            >
              <option value="">—</option>
              {expenseAccounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.code} — {locale === "bn" && a.nameBn ? a.nameBn : a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={locale === "bn" ? "কস্টিং পদ্ধতি" : "Costing method"}>
            <select
              className="gp-input"
              value={form.stockMethod}
              onChange={(e) => setForm((f) => ({ ...f, stockMethod: e.target.value }))}
            >
              <option value="">{locale === "bn" ? "ব্যবসার ডিফল্ট" : "Business default"}</option>
              <option value="fifo">FIFO</option>
              <option value="lifo">LIFO</option>
              <option value="avg">{locale === "bn" ? "ওয়েটেড অ্যাভারেজ" : "Weighted average"}</option>
            </select>
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
          ) : (
            <div />
          )}

          <div className="md:col-span-2">
            <Field label={locale === "bn" ? "পণ্য বিবরণ" : "Product description"}>
              <textarea
                className="gp-input min-h-[88px] py-2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={
                  locale === "bn"
                    ? "স্পেসিফিকেশন, ওয়ারেন্টি, নোট…"
                    : "Specs, warranty, notes…"
                }
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label={locale === "bn" ? "পণ্য ছবি" : "Product image"}>
              <div className="flex flex-wrap items-start gap-3">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="h-20 w-20 rounded-xl border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-line bg-[var(--gp-bg)] text-xs text-muted">
                    {locale === "bn" ? "নেই" : "None"}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="gp-input"
                    onChange={(e) => {
                      onImagePick(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-xs text-muted">
                    {locale === "bn"
                      ? "JPG/PNG · সর্বোচ্চ ৮০০KB"
                      : "JPG/PNG · max 800KB"}
                  </p>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      className="gp-btn gp-btn-ghost min-h-9 px-3 text-danger"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    >
                      {locale === "bn" ? "ছবি সরান" : "Remove image"}
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-muted">{t("products.supplierPrices")}</p>
                <p className="text-xs text-muted">{t("products.supplierHint")}</p>
              </div>
              <button
                type="button"
                className="gp-btn gp-btn-primary min-h-9 px-3"
                onClick={addSlot}
              >
                <Plus className="h-4 w-4" />
                {locale === "bn" ? "সরবরাহকারী রেট" : "Supplier rate"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((slot, n) => (
                <div
                  key={n}
                  className="relative rounded-xl border border-line bg-[var(--gp-bg)] p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted">
                      {locale === "bn" ? `সরবরাহকারী ${n + 1}` : `Supplier ${n + 1}`}
                    </span>
                    <button
                      type="button"
                      className="gp-btn gp-btn-ghost min-h-8 px-2 text-danger"
                      title={t("common.delete")}
                      onClick={() => removeSlot(n)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Field label={t("contacts.suppliers")}>
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
                    <Field label={`${t("products.price")} (${form.currency || "BDT"})`}>
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
