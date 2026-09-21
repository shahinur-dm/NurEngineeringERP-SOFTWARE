"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { cn, formatBDT, formatDateBD } from "@/lib/utils";

type Lead = {
  _id: string;
  name: string;
  mobile?: string;
  email?: string;
  source?: string;
  company?: string;
  product?: string;
  ownerName?: string;
  rating?: string;
  status?: string;
  notes?: string;
  value?: number;
  campaignId?: string;
  campaignName?: string;
  createdAt?: string;
};

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  source: "",
  company: "",
  product: "",
  ownerName: "",
  rating: "warm",
  status: "open",
  notes: "",
  value: "",
  campaignId: "",
};

export default function CrmLeadsPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Lead[]>([]);
  const [catalog, setCatalog] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<{ _id: string; name: string; source?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [source, setSource] = useState("all");
  const [product, setProduct] = useState("all");
  const [owner, setOwner] = useState("all");
  const [company, setCompany] = useState("all");
  const [from, setFrom] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "400" });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (rating !== "all") params.set("rating", rating);
      if (source !== "all") params.set("source", source);
      if (product !== "all") params.set("product", product);
      if (owner !== "all") params.set("ownerName", owner);
      if (company !== "all") params.set("company", company);
      if (from) {
        params.set("from", from);
        params.set("to", from);
      }
      const res = await fetch(`/api/crm/leads?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setRows(json.data || []);
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [q, status, rating, source, product, owner, company, from, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/crm/leads?limit=400")
      .then((r) => r.json())
      .then((j) => setCatalog(j.data || []))
      .catch(() => undefined);
    void fetch("/api/crm/campaigns?limit=300")
      .then((r) => r.json())
      .then((j) => setCampaigns(j.data || []))
      .catch(() => undefined);
  }, []);

  const sources = useMemo(() => Array.from(new Set(catalog.map((r) => r.source).filter(Boolean))) as string[], [catalog]);
  const products = useMemo(() => Array.from(new Set(catalog.map((r) => r.product).filter(Boolean))) as string[], [catalog]);
  const owners = useMemo(() => Array.from(new Set(catalog.map((r) => r.ownerName).filter(Boolean))) as string[], [catalog]);
  const companies = useMemo(() => Array.from(new Set(catalog.map((r) => r.company).filter(Boolean))) as string[], [catalog]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      hot: rows.filter((r) => r.rating === "hot").length,
      warm: rows.filter((r) => r.rating === "warm").length,
      cold: rows.filter((r) => r.rating === "cold").length,
      won: rows.filter((r) => r.status === "won").length,
      lost: rows.filter((r) => r.status === "lost").length,
    }),
    [rows],
  );

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Lead) {
    setEditing(row);
    setForm({
      name: row.name || "",
      mobile: row.mobile || "",
      email: row.email || "",
      source: row.source || "",
      company: row.company || "",
      product: row.product || "",
      ownerName: row.ownerName || "",
      rating: row.rating || "warm",
      status: row.status || "open",
      notes: row.notes || "",
      value: row.value != null ? String(row.value) : "",
      campaignId: row.campaignId || "",
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
    setMsg("");
    try {
      const campaign = campaigns.find((c) => c._id === form.campaignId);
      const payload = {
        ...form,
        value: form.value === "" ? undefined : Number(form.value),
        campaignName: campaign?.name || undefined,
        source: form.source || campaign?.source || "",
      };
      const res = await fetch(editing ? `/api/crm/leads/${editing._id}` : "/api/crm/leads", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setOpen(false);
      await load();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this lead?")) return;
    const res = await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  async function patchStatus(row: Lead, next: string) {
    const res = await fetch(`/api/crm/leads/${row._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  async function patchRating(row: Lead, next: string) {
    const res = await fetch(`/api/crm/leads/${row._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: next }),
    });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  function exportCsv() {
    const header = ["Name", "Mobile", "Email", "Company", "Product", "Source", "Campaign", "Owner", "Rating", "Status", "Value", "Created"];
    const lines = rows.map((r) =>
      [r.name, r.mobile, r.email, r.company, r.product, r.source, r.campaignName, r.ownerName, r.rating, r.status, r.value, r.createdAt]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const sel = "h-11 rounded-xl border border-[#e6eef8] bg-white px-3 text-sm text-slate-700";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("crm.leads")}
        subtitle="Track and convert your potential customers."
        actions={
          <>
            <button type="button" className="rounded-xl border border-[#dbe7f5] bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>
              + Add Lead
            </button>
          </>
        }
      />
      {msg ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p> : null}

      <div className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className={sel} placeholder="Search name, email, phone, company..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="open">New / Open</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="unqualified">Unqualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <select className={sel} value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="all">All ratings</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <select className={sel} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={sel} value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="all">All products</option>
            {products.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={sel} value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="all">All companies</option>
            {companies.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input className={sel} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <select className={sel} value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">All owners</option>
            {owners.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "TOTAL", value: counts.total, cls: "bg-slate-100 text-slate-700" },
          { label: "HOT", value: counts.hot, cls: "bg-rose-50 text-rose-600" },
          { label: "WARM", value: counts.warm, cls: "bg-amber-50 text-amber-700" },
          { label: "COLD", value: counts.cold, cls: "bg-sky-50 text-sky-700" },
          { label: "WON", value: counts.won, cls: "bg-emerald-50 text-emerald-700" },
          { label: "LOST", value: counts.lost, cls: "bg-slate-100 text-slate-600" },
        ].map((c) => (
          <span key={c.label} className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", c.cls)}>
            {c.label} <span className="text-sm">{c.value}</span>
          </span>
        ))}
      </div>

      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState title="No leads yet" description="Add a lead or attach one from a campaign." action={<button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>+ Add Lead</button>} />
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#e8eef6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <table className="gp-table min-w-[1100px]">
            <thead>
              <tr className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                <th>Lead</th>
                <th>Contact</th>
                <th>Products</th>
                <th>Source</th>
                <th>Campaign</th>
                <th>Owner</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Value</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <button type="button" className="flex items-center gap-2 text-left font-semibold text-slate-900" onClick={() => setView(row)}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3b5bfd] text-[0.7rem] font-bold text-white">
                        {(row.name || "?").trim().slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        {row.name}
                        <span className="block text-xs font-normal text-slate-400">{row.company || "—"}</span>
                      </span>
                    </button>
                  </td>
                  <td>
                    <div className="text-sm">{row.mobile || "—"}</div>
                    <div className="text-xs text-slate-400">{row.email}</div>
                  </td>
                  <td>
                    {row.product ? (
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{row.product}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-sm text-slate-600">{row.source || "—"}</td>
                  <td className="text-sm text-slate-600">{row.campaignName || "—"}</td>
                  <td className="text-sm">{row.ownerName || "—"}</td>
                  <td>
                    <select className="rounded-lg border border-[#e6eef8] px-2 py-1 text-sm" value={row.rating || "warm"} onChange={(e) => void patchRating(row, e.target.value)}>
                      <option value="hot">Hot</option>
                      <option value="warm">Warm</option>
                      <option value="cold">Cold</option>
                    </select>
                  </td>
                  <td>
                    <select className="rounded-lg border border-[#e6eef8] px-2 py-1 text-sm" value={row.status || "open"} onChange={(e) => void patchStatus(row, e.target.value)}>
                      <option value="open">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="unqualified">Unqualified</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="text-sm">{row.value != null ? formatBDT(row.value) : "—"}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{row.createdAt ? formatDateBD(row.createdAt) : "—"}</td>
                  <td className="whitespace-nowrap">
                    <button type="button" className="text-xs font-semibold text-blue-600" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="ml-2 text-xs font-semibold text-rose-600" onClick={() => void onDelete(row._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={open} title={editing ? "Edit Lead" : "Add Lead"} onClose={() => setOpen(false)}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Name"><input className="gp-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mobile"><input className="gp-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
          <Field label="Email"><input className="gp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Company"><input className="gp-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Product"><input className="gp-input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></Field>
          <Field label="Source"><input className="gp-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
          <Field label="Campaign">
            <select className="gp-input" value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Owner"><input className="gp-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></Field>
          <Field label="Value"><input className="gp-input" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          <Field label="Rating">
            <select className="gp-input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="gp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="open">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea className="gp-input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>{busy ? t("common.loading") : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!view} title="Lead details" onClose={() => setView(null)}>
        {view ? (
          <div className="space-y-2 text-sm">
            <p><b>{view.name}</b></p>
            <p>Mobile: {view.mobile || "—"}</p>
            <p>Email: {view.email || "—"}</p>
            <p>Company: {view.company || "—"}</p>
            <p>Product: {view.product || "—"}</p>
            <p>Source: {view.source || "—"}</p>
            <p>Campaign: {view.campaignName || "—"}</p>
            <p>Owner: {view.ownerName || "—"}</p>
            <p>Rating: {view.rating || "—"}</p>
            <p>Status: {view.status || "—"}</p>
            <p>Value: {view.value != null ? formatBDT(view.value) : "—"}</p>
            <p>{view.notes}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="gp-btn gp-btn-primary" onClick={() => openEdit(view)}>Edit</button>
              <Link className="gp-btn gp-btn-ghost" href={`/crm/followups?leadId=${view._id}`}>Create Follow-up</Link>
              <Link className="gp-btn gp-btn-ghost" href={`/crm/deals?leadId=${view._id}`}>Create Deal</Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
