"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState, Field, FilterBar, Modal, PageHeader } from "@/components/ui";
import { CrudForm } from "@/components/CrudForm";
import { getCrudConfig } from "@/lib/crud-config";
import { formatBDT, formatDateBD } from "@/lib/utils";

type PurchaseRow = {
  _id: string;
  referenceNo: string;
  supplierName: string;
  supplierId?: string;
  grandTotal: number;
  dueAmount: number;
  purchaseDate: string;
  note?: string;
};

export default function PurchasesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const purchaseCrud = getCrudConfig("purchases");
  const [data, setData] = useState<PurchaseRow[]>([]);
  const [summary, setSummary] = useState({ grandTotal: 0, dueAmount: 0, count: 0 });
  const [products, setProducts] = useState<{ _id: string; name: string; nameBn?: string; sku: string; purchasePrice: number }[]>([]);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    locationId: "",
    supplierId: "",
    productId: "",
    qty: "1",
    unitCost: "",
  });

  async function load() {
    const res = await fetch("/api/purchases?limit=100");
    const json = await res.json();
    setData(json.data || []);
    setSummary(json.summary || { grandTotal: 0, dueAmount: 0, count: 0 });
  }

  useEffect(() => {
    load();
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        setLocations(d.locations || []);
        if (d.locations?.[0]) setForm((f) => ({ ...f, locationId: d.locations[0]._id }));
      });
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => setProducts(d.data || []));
    fetch("/api/contacts?type=supplier&limit=100")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.data || []));
  }, []);

  async function create() {
    const product = products.find((p) => p._id === form.productId);
    const supplier = suppliers.find((s) => s._id === form.supplierId);
    if (!product || !form.locationId) return;
    const qty = Number(form.qty || 1);
    const unitCost = Number(form.unitCost || product.purchasePrice);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: form.locationId,
        supplierId: form.supplierId || undefined,
        supplierName: supplier?.name || "Supplier",
        status: "received",
        items: [
          {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            qty,
            unitCost,
          },
        ],
        payments: [{ method: "cash", amount: qty * unitCost }],
      }),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    }
  }

  async function saveEdit(payload: Record<string, unknown>) {
    if (!editing) return;
    await fetch(`/api/purchases/${editing._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setFormOpen(false);
    setEditing(null);
    load();
  }

  async function removePurchase(id: string) {
    if (!confirm(locale === "bn" ? "মুছে ফেলবেন?" : "Delete?")) return;
    await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader
        title={t("purchases.title")}
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={() => setShowForm((v) => !v)}>
            {t("purchases.newPurchase")}
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="gp-card p-4">
          <p className="text-muted">{t("common.total")}</p>
          <p className="gp-money text-2xl text-[var(--gp-ink)]">{formatBDT(summary.grandTotal, locale)}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-muted">{t("common.due")}</p>
          <p className="gp-money text-2xl text-[var(--gp-ink)]">{formatBDT(summary.dueAmount, locale)}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-muted">{t("pos.items")}</p>
          <p className="text-2xl font-bold">{summary.count}</p>
        </div>
      </div>

      {showForm ? (
        <div className="gp-card mb-5 grid gap-3 p-5 md:grid-cols-2">
          <Field label={t("dashboard.location")}>
            <select className="gp-input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("purchases.supplier")}>
            <select className="gp-input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("products.title")}>
            <select
              className="gp-input"
              value={form.productId}
              onChange={(e) => {
                const p = products.find((x) => x._id === e.target.value);
                setForm({
                  ...form,
                  productId: e.target.value,
                  unitCost: String(p?.purchasePrice ?? ""),
                });
              }}
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {locale === "bn" && p.nameBn ? p.nameBn : p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("common.quantity")}>
            <input className="gp-input" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </Field>
          <Field label={t("products.purchasePrice")}>
            <input className="gp-input" type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <button type="button" className="gp-btn gp-btn-primary w-full" onClick={create}>
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : null}

      <FilterBar>
        <div className="xl:col-span-4">
          <button type="button" className="gp-btn gp-btn-ghost" onClick={load}>
            {t("dashboard.apply")}
          </button>
        </div>
      </FilterBar>

      <div className="gp-card overflow-auto">
        {data.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table">
            <thead>
              <tr>
                <th>{t("purchases.reference")}</th>
                <th>{t("purchases.supplier")}</th>
                <th>{t("common.date")}</th>
                <th>{t("common.grandTotal")}</th>
                <th>{t("common.due")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p._id}>
                  <td className="font-semibold">{p.referenceNo}</td>
                  <td>
                    {p.supplierId ? (
                      <Link
                        href={`/contacts/${p.supplierId}/statement`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {p.supplierName}
                      </Link>
                    ) : (
                      p.supplierName
                    )}
                  </td>
                  <td>{formatDateBD(p.purchaseDate, locale)}</td>
                  <td className="font-bold">{formatBDT(p.grandTotal, locale)}</td>
                  <td>{formatBDT(p.dueAmount, locale)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="gp-btn gp-btn-ghost min-h-9 px-2"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="gp-btn gp-btn-danger min-h-9 px-2"
                        onClick={() => removePurchase(p._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={formOpen && !!purchaseCrud}
        title={t("common.edit")}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        {purchaseCrud && editing ? (
          <CrudForm
            config={purchaseCrud}
            initial={editing}
            isEdit
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSubmit={saveEdit}
          />
        ) : null}
      </Modal>
    </div>
  );
}
