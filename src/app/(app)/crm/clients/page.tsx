"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";

type Client = {
  _id: string;
  name: string;
  mobile?: string;
  email?: string;
  company?: string;
  leadId?: string;
  notes?: string;
  status?: string;
};

type LeadOpt = { _id: string; name: string };

const empty = { name: "", mobile: "", email: "", company: "", leadId: "", notes: "", status: "active" };

export default function CrmClientsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Client[]>([]);
  const [leads, setLeads] = useState<LeadOpt[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (q) params.set("q", q);
      const [c, l] = await Promise.all([
        fetch(`/api/crm/clients?${params}`).then((r) => r.json()),
        fetch("/api/crm/leads?limit=300").then((r) => r.json()),
      ]);
      setRows(c.data || []);
      setLeads(l.data || []);
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [q, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(row: Client) {
    setEditing(row);
    setForm({
      name: row.name || "",
      mobile: row.mobile || "",
      email: row.email || "",
      company: row.company || "",
      leadId: row.leadId || "",
      notes: row.notes || "",
      status: row.status || "active",
    });
    setOpen(true);
    setView(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMsg("Name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/crm/clients/${editing._id}` : "/api/crm/clients", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("error");
      setOpen(false);
      await load();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this client?")) return;
    const res = await fetch(`/api/crm/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        title={t("crm.clients")}
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={openAdd}>
            + Add Client
          </button>
        }
      />
      {msg ? <p className="mb-3 text-sm text-red-600">{msg}</p> : null}
      <input className="gp-input mb-4 max-w-sm" placeholder="Search clients..." value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && rows.length === 0 ? <EmptyState message={t("common.noData")} /> : null}
      {!loading && rows.length > 0 ? (
        <div className="gp-card overflow-x-auto">
          <table className="gp-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Company</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <button type="button" className="font-medium text-[var(--gp-primary)]" onClick={() => setView(row)}>
                      {row.name}
                    </button>
                  </td>
                  <td>
                    {row.mobile}
                    <div className="text-xs text-muted">{row.email}</div>
                  </td>
                  <td>{row.company}</td>
                  <td>{row.status}</td>
                  <td>
                    <button type="button" className="gp-btn gp-btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button type="button" className="gp-btn gp-btn-ghost px-2 py-1 text-xs" onClick={() => void onDelete(row._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={open} title={editing ? "Edit Client" : "Add Client"} onClose={() => setOpen(false)}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Name">
            <input className="gp-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Mobile">
            <input className="gp-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="gp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Company">
            <input className="gp-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label="Related lead">
            <select className="gp-input" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
              <option value="">None</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="gp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea className="gp-input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!view} title="Client details" onClose={() => setView(null)}>
        {view ? (
          <div className="space-y-2 text-sm">
            <p><b>{view.name}</b></p>
            <p>{view.mobile}</p>
            <p>{view.email}</p>
            <p>{view.company}</p>
            <p>{view.notes}</p>
            <button type="button" className="gp-btn gp-btn-primary" onClick={() => openEdit(view)}>
              Edit
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
