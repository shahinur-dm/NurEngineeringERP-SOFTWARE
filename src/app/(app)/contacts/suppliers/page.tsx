"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, Field, FilterBar, Modal, PageHeader } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { displaySupplierLabel } from "@/lib/supplier-label";

type Supplier = {
  _id: string;
  name: string;
  nameBn?: string;
  mobile?: string;
  address?: string;
  balance?: number;
  openingBalance?: number;
};

type FormState = {
  name: string;
  nameBn: string;
  mobile: string;
  address: string;
  openingBalance: string;
};

const emptyForm: FormState = {
  name: "",
  nameBn: "",
  mobile: "",
  address: "",
  openingBalance: "0",
};

export default function SuppliersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type: "supplier", limit: "100" });
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/contacts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error("load_failed");
      setRows(json.data || []);
    } catch {
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [q, t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setMessage("");
    setModalOpen(true);
  }

  async function openEdit(row: Supplier) {
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/contacts/${row._id}`);
      const json = await res.json();
      const doc: Supplier = json.data || row;
      setEditing(doc);
      setForm({
        name: doc.name || "",
        nameBn: doc.nameBn || "",
        mobile: doc.mobile || "",
        address: doc.address || "",
        openingBalance: String(doc.openingBalance ?? doc.balance ?? 0),
      });
      setModalOpen(true);
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      setMessage(
        locale === "bn" ? "নাম ও মোবাইল আবশ্যক" : "Name and mobile are required",
      );
      return;
    }

    setBusy(true);
    setMessage("");
    const payload = {
      type: "supplier",
      name: form.name.trim(),
      nameBn: form.nameBn.trim(),
      mobile: form.mobile.trim(),
      address: form.address.trim(),
      openingBalance: Number(form.openingBalance || 0),
      balance: Number(form.openingBalance || 0),
    };

    try {
      const res = await fetch(
        editing ? `/api/contacts/${editing._id}` : "/api/contacts",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "fail");

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
      setMessage(
        locale === "bn"
          ? editing
            ? "সরবরাহকারী আপডেট হয়েছে"
            : "সরবরাহকারী যোগ হয়েছে"
          : editing
            ? "Supplier updated"
            : "Supplier created",
      );
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(locale === "bn" ? "সরবরাহকারী মুছবেন?" : "Delete this supplier?")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("fail");
      // Optimistic remove, then refresh
      setRows((prev) => prev.filter((r) => r._id !== id));
      await load();
      setMessage(locale === "bn" ? "সরবরাহকারী মুছে ফেলা হয়েছে" : "Supplier deleted");
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={locale === "bn" ? "সরবরাহকারী" : "Suppliers"}
        subtitle={
          locale === "bn"
            ? "যোগ / সম্পাদনা / মুছুন — সব ডায়নামিক"
            : "Add / edit / delete — fully dynamic"
        }
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("common.add")}
          </button>
        }
      />

      {message ? (
        <p className="mb-4 rounded-xl border border-line bg-[var(--gp-primary-soft)] px-3 py-2 text-sm font-semibold text-primary">
          {message}
        </p>
      ) : null}

      <FilterBar>
        <Field label={t("common.search")}>
          <input
            className="gp-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
          />
        </Field>
        <div className="flex items-end">
          <button type="button" className="gp-btn gp-btn-primary w-full" onClick={load}>
            {t("common.apply")}
          </button>
        </div>
      </FilterBar>

      {loading ? (
        <EmptyState message={t("app.loading")} />
      ) : rows.length === 0 ? (
        <EmptyState message={t("common.noData")} />
      ) : (
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>{locale === "bn" ? "নাম" : "Name"}</th>
                <th>{locale === "bn" ? "মোবাইল" : "Mobile"}</th>
                <th>{locale === "bn" ? "ব্যালেন্স" : "Balance"}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const name = displaySupplierLabel(s, locale);
                return (
                  <tr key={s._id}>
                    <td>
                      <Link
                        href={`/contacts/suppliers/${s._id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {name}
                      </Link>
                    </td>
                    <td>{s.mobile || "—"}</td>
                    <td className="gp-money">{formatBDT(s.balance || 0, locale)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Link
                          href={`/contacts/suppliers/${s._id}`}
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5"
                          title={locale === "bn" ? "ইতিহাস" : "History"}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5"
                          disabled={busy}
                          onClick={() => openEdit(s)}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5 text-danger"
                          disabled={busy}
                          onClick={() => onDelete(s._id)}
                          title={t("common.delete")}
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
        title={editing ? t("common.edit") : t("common.add")}
        compact
        onClose={() => {
          if (busy) return;
          setModalOpen(false);
          setEditing(null);
        }}
      >
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Field label={locale === "bn" ? "নাম" : "Name"}>
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
          <Field label={locale === "bn" ? "মোবাইল" : "Mobile"}>
            <input
              className="gp-input"
              required
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "ব্যালেন্স" : "Balance"}>
            <input
              type="number"
              className="gp-input"
              value={form.openingBalance}
              onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
            />
          </Field>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[0.8rem] font-semibold text-muted">
              {locale === "bn" ? "ঠিকানা" : "Address"}
            </span>
            <textarea
              className="gp-input min-h-[72px] py-2"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </label>
          <div className="mt-1 flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              className="gp-btn gp-btn-ghost min-h-10 px-4"
              disabled={busy}
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="gp-btn gp-btn-primary min-h-10 px-5" disabled={busy}>
              {busy ? "..." : t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
