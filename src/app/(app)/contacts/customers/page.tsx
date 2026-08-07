"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, Field, FilterBar, Modal, PageHeader } from "@/components/ui";
import { formatBDT } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks";

type Customer = {
  _id: string;
  name: string;
  nameBn?: string;
  mobile?: string;
  address?: string;
  balance?: number;
  openingBalance?: number;
  email?: string;
};

type FormState = {
  name: string;
  nameBn: string;
  mobile: string;
  email: string;
  address: string;
  openingBalance: string;
};

const emptyForm: FormState = {
  name: "",
  nameBn: "",
  mobile: "",
  email: "",
  address: "",
  openingBalance: "0",
};

export default function CustomersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type: "customer", limit: "100" });
      if (debouncedQ.trim()) qs.set("q", debouncedQ.trim());
      const res = await fetch(`/api/contacts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error("load_failed");
      setRows(json.data || []);
    } catch {
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(row: Customer) {
    setEditing(row);
    setForm({
      name: row.name || "",
      nameBn: row.nameBn || "",
      mobile: row.mobile || "",
      email: row.email || "",
      address: row.address || "",
      openingBalance: String(row.openingBalance ?? row.balance ?? 0),
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      setMessage(locale === "bn" ? "নাম ও মোবাইল আবশ্যক" : "Name and mobile are required");
      return;
    }
    setBusy(true);
    setMessage("");
    const payload: Record<string, unknown> = {
      type: "customer",
      name: form.name.trim(),
      nameBn: form.nameBn.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      openingBalance: Number(form.openingBalance || 0),
    };
    // Only seed running balance from opening on create — never overwrite receivable on edit
    if (!editing) {
      payload.balance = Number(form.openingBalance || 0);
    }
    try {
      const res = await fetch(editing ? `/api/contacts/${editing._id}` : "/api/contacts", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("fail");
      setModalOpen(false);
      await load();
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(locale === "bn" ? "গ্রাহক মুছবেন?" : "Delete customer?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title={t("contacts.customers")}
        subtitle={
          locale === "bn"
            ? "নামে ক্লিক করে স্টেটমেন্ট দেখুন"
            : "Click a name to open transaction statement"
        }
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("contacts.addCustomer")}
          </button>
        }
      />

      {message ? <p className="mb-3 text-sm text-danger">{message}</p> : null}

      <FilterBar>
        <Field label={t("common.search")}>
          <input className="gp-input" value={q} onChange={(e) => setQ(e.target.value)} />
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
                <th>{locale === "bn" ? "প্রাপ্য (Receivable)" : "Receivable"}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const name = locale === "bn" && c.nameBn ? c.nameBn : c.name;
                return (
                  <tr key={c._id}>
                    <td>
                      <Link
                        href={`/contacts/${c._id}/statement`}
                        className="font-semibold text-primary hover:underline"
                        title={locale === "bn" ? "স্টেটমেন্ট দেখুন" : "View statement"}
                      >
                        {name}
                      </Link>
                    </td>
                    <td>{c.mobile || "—"}</td>
                    <td className="gp-money">{formatBDT(c.balance || 0, locale)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Link
                          href={`/contacts/${c._id}/statement`}
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5"
                          title={locale === "bn" ? "স্টেটমেন্ট" : "Statement"}
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5"
                          onClick={() => openEdit(c)}
                          title={t("common.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="gp-btn gp-btn-ghost min-h-9 px-2.5 text-danger"
                          onClick={() => onDelete(c._id)}
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
        onClose={() => {
          if (!busy) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
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
          <Field label="Email">
            <input
              className="gp-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "প্রারম্ভিক ব্যালেন্স (Opening)" : "Opening balance"}>
            <input
              type="number"
              className="gp-input"
              value={form.openingBalance}
              onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
            />
          </Field>
          {editing ? (
            <Field label={locale === "bn" ? "বর্তমান প্রাপ্য" : "Current receivable"}>
              <input
                className="gp-input"
                readOnly
                value={formatBDT(editing.balance || 0, locale)}
              />
            </Field>
          ) : null}
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
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              className="gp-btn gp-btn-ghost"
              disabled={busy}
              onClick={() => setModalOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>
              {busy ? "..." : t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
