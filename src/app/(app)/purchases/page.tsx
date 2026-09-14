"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState, Field, Modal } from "@/components/ui";
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
  const [products, setProducts] = useState<{ _id: string; name: string; nameBn?: string; sku: string; brand?: string; categoryId?: string; purchasePrice: number; currency?: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string; mobile?: string; phone?: string; notes?: string }[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    purchaseType: "local",
    locationId: "",
    supplierId: "",
    productId: "",
    qty: "1",
    unitCost: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    receivingDate: new Date().toISOString().slice(0, 10),
    supplierWhatsapp: "",
    supplierWechat: "",
    shippingCost: "0",
    otherCost: "0",
    discount: "0",
    paidAmount: "",
    paymentMethod: "cash",
    currency: "BDT",
    note: "",
    documentName: "",
    documentUrl: "",
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
    const subtotal = qty * unitCost;
    const grandTotal =
      subtotal + Number(form.shippingCost || 0) + Number(form.otherCost || 0) - Number(form.discount || 0);
    const paidAmount = form.paidAmount === "" ? grandTotal : Number(form.paidAmount || 0);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: form.locationId,
        purchaseType: form.purchaseType,
        supplierId: form.supplierId || undefined,
        supplierName: supplier?.name || "Supplier",
        supplierWhatsapp: form.supplierWhatsapp,
        supplierWechat: form.supplierWechat,
        status: "received",
        purchaseDate: form.purchaseDate,
        receivingDate: form.receivingDate,
        shippingCost: Number(form.shippingCost || 0),
        otherCost: Number(form.otherCost || 0),
        discount: Number(form.discount || 0),
        currency: form.currency,
        note: form.note,
        documentName: form.documentName,
        documentUrl: form.documentUrl,
        items: [
          {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            qty,
            unitCost,
          },
        ],
        payments: [{ method: form.paymentMethod, amount: paidAmount }],
      }),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    }
  }

  const selectedProduct = products.find((p) => p._id === form.productId);
  const subtotal = Number(form.qty || 0) * Number(form.unitCost || 0);
  const grandTotal = Math.max(
    0,
    subtotal + Number(form.shippingCost || 0) + Number(form.otherCost || 0) - Number(form.discount || 0),
  );
  const paidAmount = form.paidAmount === "" ? grandTotal : Number(form.paidAmount || 0);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--gp-border)] pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--gp-ink)]">
          {t("purchases.title")}
        </h1>
        <div className="ml-auto grid min-w-0 grid-cols-3 gap-2 max-sm:order-3 max-sm:ml-0 max-sm:w-full">
          <div className="gp-card min-w-0 px-3 py-1.5">
            <p className="text-[0.68rem] leading-tight text-muted">{t("common.total")}</p>
            <p className="gp-money truncate text-sm font-bold leading-tight text-[var(--gp-ink)]">{formatBDT(summary.grandTotal, locale)}</p>
          </div>
          <div className="gp-card min-w-0 px-3 py-1.5">
            <p className="text-[0.68rem] leading-tight text-muted">{t("common.due")}</p>
            <p className="gp-money truncate text-sm font-bold leading-tight text-[var(--gp-ink)]">{formatBDT(summary.dueAmount, locale)}</p>
          </div>
          <div className="gp-card min-w-0 px-3 py-1.5">
            <p className="text-[0.68rem] leading-tight text-muted">{t("pos.items")}</p>
            <p className="text-sm font-bold leading-tight">{summary.count}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
          <button
            type="button"
            className={`gp-btn min-h-8 px-3 py-1 ${showForm && form.purchaseType === "local" ? "gp-btn-primary" : "gp-btn-ghost"}`}
            onClick={() => {
              setForm((current) => ({ ...current, purchaseType: "local", currency: "BDT" }));
              setShowForm(true);
            }}
          >
            Local Purchase
          </button>
          <button
            type="button"
            className={`gp-btn min-h-8 px-3 py-1 ${showForm && form.purchaseType === "import" ? "gp-btn-primary" : "gp-btn-ghost"}`}
            onClick={() => {
              setForm((current) => ({ ...current, purchaseType: "import", currency: "USD" }));
              setShowForm(true);
            }}
          >
            Import Purchase
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="gp-card grid gap-x-3 gap-y-2 p-3 md:grid-cols-2">
          <Field label="Purchase Reference No."><input className="gp-input min-h-8 py-1" value="Auto" readOnly /></Field>
          <Field label="Purchase Date"><input className="gp-input min-h-8 py-1" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
          <Field label="Receiving Date"><input className="gp-input min-h-8 py-1" type="date" value={form.receivingDate} onChange={(e) => setForm({ ...form, receivingDate: e.target.value })} /></Field>
          <Field label={t("dashboard.location")}>
            <select className="gp-input min-h-8 py-1" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
              {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label={t("purchases.supplier")}>
            <select
              className="gp-input min-h-8 py-1"
              value={form.supplierId}
              onChange={(e) => {
                const supplier = suppliers.find((s) => s._id === e.target.value);
                setForm({ ...form, supplierId: e.target.value, supplierWhatsapp: supplier?.mobile || supplier?.phone || "", supplierWechat: supplier?.notes || "" });
              }}
            >
              <option value="">—</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier WhatsApp"><input className="gp-input min-h-8 py-1" value={form.supplierWhatsapp} onChange={(e) => setForm({ ...form, supplierWhatsapp: e.target.value })} /></Field>
          <Field label="Supplier WeChat"><input className="gp-input min-h-8 py-1" value={form.supplierWechat} onChange={(e) => setForm({ ...form, supplierWechat: e.target.value })} /></Field>
          <Field label={t("products.title")}>
            <select className="gp-input min-h-8 py-1" value={form.productId} onChange={(e) => {
              const p = products.find((x) => x._id === e.target.value);
              setForm({ ...form, productId: e.target.value, unitCost: String(p?.purchasePrice ?? ""), currency: p?.currency || form.currency });
            }}>
              <option value="">—</option>
              {products.map((p) => <option key={p._id} value={p._id}>{locale === "bn" && p.nameBn ? p.nameBn : p.name}</option>)}
            </select>
          </Field>
          <Field label="Product Name"><input className="gp-input min-h-8 py-1" value={selectedProduct?.name || ""} readOnly /></Field>
          <Field label="Product Name (Bangla)"><input className="gp-input min-h-8 py-1" value={selectedProduct?.nameBn || ""} readOnly /></Field>
          <Field label="SKU / Product Code"><input className="gp-input min-h-8 py-1" value={selectedProduct?.sku || ""} readOnly /></Field>
          <Field label="Brand"><input className="gp-input min-h-8 py-1" value={selectedProduct?.brand || ""} readOnly /></Field>
          <Field label="Category"><input className="gp-input min-h-8 py-1" value={selectedProduct?.categoryId || ""} readOnly /></Field>
          <Field label={t("common.quantity")}><input className="gp-input min-h-8 py-1" type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
          <Field label={t("products.purchasePrice")}><input className="gp-input min-h-8 py-1" type="number" min="0" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} /></Field>
          <Field label="Currency"><select className="gp-input min-h-8 py-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{["BDT", "USD", "RMB"].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Shipping Cost"><input className="gp-input min-h-8 py-1" type="number" min="0" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} /></Field>
          <Field label="Other Cost"><input className="gp-input min-h-8 py-1" type="number" min="0" value={form.otherCost} onChange={(e) => setForm({ ...form, otherCost: e.target.value })} /></Field>
          <Field label="Discount"><input className="gp-input min-h-8 py-1" type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
          <Field label="Subtotal"><input className="gp-input min-h-8 py-1" value={subtotal.toFixed(2)} readOnly /></Field>
          <Field label="Grand Total"><input className="gp-input min-h-8 py-1" value={grandTotal.toFixed(2)} readOnly /></Field>
          <Field label="Paid Amount"><input className="gp-input min-h-8 py-1" type="number" min="0" value={form.paidAmount} placeholder={grandTotal.toFixed(2)} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field>
          <Field label="Due Amount"><input className="gp-input min-h-8 py-1" value={dueAmount.toFixed(2)} readOnly /></Field>
          <Field label="Payment Method"><select className="gp-input min-h-8 py-1" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{["cash", "card", "bkash", "nagad", "rocket", "cheque", "bank", "credit"].map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
          <Field label="Payment Status"><input className="gp-input min-h-8 py-1" value={dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Due"} readOnly /></Field>
          <Field label="Supplier Invoice / Document Upload">
            <input className="gp-input min-h-8 py-1" type="file" accept=".pdf,image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || file.size > 1024 * 1024) return;
              const reader = new FileReader();
              reader.onload = () => setForm((current) => ({ ...current, documentName: file.name, documentUrl: String(reader.result || "") }));
              reader.readAsDataURL(file);
            }} />
          </Field>
          <Field label="Notes"><textarea className="gp-input min-h-16 py-1" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="flex items-end justify-end md:col-span-2">
            <button type="button" className="gp-btn gp-btn-primary min-h-8 px-5 py-1" onClick={create}>
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="gp-card overflow-auto">
        {data.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table min-w-[720px] lg:w-full lg:min-w-0 lg:table-fixed [&_td]:py-2 [&_th]:py-2">
            <colgroup>
              <col className="lg:w-[15%]" />
              <col className="lg:w-[25%]" />
              <col className="lg:w-[15%]" />
              <col className="lg:w-[16%]" />
              <col className="lg:w-[14%]" />
              <col className="lg:w-[15%]" />
            </colgroup>
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
                    <div className="flex flex-nowrap gap-1">
                      <button
                        type="button"
                        className="gp-btn gp-btn-ghost min-h-8 min-w-8 px-1.5"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="gp-btn gp-btn-danger min-h-8 min-w-8 px-1.5"
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
