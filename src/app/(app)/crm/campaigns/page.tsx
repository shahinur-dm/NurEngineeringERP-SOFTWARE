"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { cn, formatDateBD } from "@/lib/utils";

type Stats = {
  leads: number;
  qualified: number;
  followups: number;
  deals: number;
  wonDeals: number;
  pipelineValue: number;
  wonValue: number;
  conversion: number;
};

type Campaign = {
  _id: string;
  name: string;
  source?: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  description?: string;
  budget?: number;
  audience?: string;
  ownerName?: string;
  createdAt?: string;
  stats?: Stats;
};

type Lead = { _id: string; name: string; mobile?: string; company?: string; status?: string; campaignId?: string };

type Kpis = {
  total: number;
  active: number;
  leads: number;
  qualified: number;
  followups: number;
  deals: number;
  wonDeals: number;
  campaignValue: number;
  conversion: number;
};

const SOURCES = [
  "Facebook Ads",
  "Google Ads",
  "Website",
  "Referral",
  "WhatsApp",
  "Phone",
  "Email",
  "Trade Fair",
  "LinkedIn",
  "Direct Sales",
];

const STATUSES = ["draft", "scheduled", "active", "paused", "completed", "cancelled"];

const empty = {
  name: "",
  source: "Facebook Ads",
  status: "draft",
  startsAt: "",
  endsAt: "",
  notes: "",
  description: "",
  budget: "",
  audience: "",
  ownerName: "",
};

function money(n: number) {
  return `BDT ${Number(n || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function badge(status?: string) {
  const s = (status || "draft").toLowerCase();
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    scheduled: "bg-sky-50 text-sky-700",
    active: "bg-emerald-50 text-emerald-700",
    paused: "bg-amber-50 text-amber-700",
    completed: "bg-blue-50 text-blue-700",
    cancelled: "bg-rose-50 text-rose-700",
    ended: "bg-blue-50 text-blue-700",
  };
  return map[s] || map.draft;
}

export default function CrmCampaignsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [view, setView] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState(empty);
  const [leadForm, setLeadForm] = useState({
    name: "",
    mobile: "",
    email: "",
    company: "",
    product: "",
    ownerName: "",
    rating: "warm",
    status: "open",
    notes: "",
  });
  const [leadOpen, setLeadOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/crm/campaigns?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRows(json.data || []);
      setKpis(json.kpis || null);
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [q, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetails(row: Campaign) {
    setView(row);
    const res = await fetch(`/api/crm/leads?campaignId=${row._id}&limit=200`);
    const json = await res.json();
    setLeads(json.data || []);
  }

  function openAdd() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(row: Campaign) {
    setEditing(row);
    setForm({
      name: row.name || "",
      source: row.source || "Facebook Ads",
      status: row.status || "draft",
      startsAt: row.startsAt ? row.startsAt.slice(0, 10) : "",
      endsAt: row.endsAt ? row.endsAt.slice(0, 10) : "",
      notes: row.notes || "",
      description: row.description || "",
      budget: row.budget != null ? String(row.budget) : "",
      audience: row.audience || "",
      ownerName: row.ownerName || "",
    });
    setOpen(true);
    setView(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.source.trim()) {
      setMsg("Campaign name and source are required.");
      return;
    }
    if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) {
      setMsg("End date cannot be before start date.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const payload = {
        ...form,
        budget: form.budget === "" ? undefined : Number(form.budget),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      };
      const res = await fetch(editing ? `/api/crm/campaigns/${editing._id}` : "/api/crm/campaigns", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409) {
        setMsg("A campaign with this name already exists.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "error");
      setOpen(false);
      setOk("Campaign saved.");
      await load();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this campaign?")) return;
    const res = await fetch(`/api/crm/campaigns/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    setView(null);
    await load();
  }

  async function addLead(e: FormEvent) {
    e.preventDefault();
    if (!view) return;
    if (!leadForm.name.trim() || !leadForm.mobile.trim()) {
      setMsg("Lead name and phone are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadForm,
          campaignId: view._id,
          campaignName: view.name,
          source: view.source,
        }),
      });
      if (!res.ok) throw new Error("error");
      setLeadOpen(false);
      setLeadForm({ name: "", mobile: "", email: "", company: "", product: "", ownerName: "", rating: "warm", status: "open", notes: "" });
      setOk("Lead added to campaign.");
      await openDetails(view);
      await load();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ["Name", "Source", "Status", "Start", "End", "Leads", "Qualified", "Deals", "Won", "Value"];
    const lines = rows.map((r) =>
      [r.name, r.source, r.status, r.startsAt, r.endsAt, r.stats?.leads, r.stats?.qualified, r.stats?.deals, r.stats?.wonDeals, r.stats?.pipelineValue]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "campaigns.csv";
    a.click();
  }

  const cards = useMemo(
    () =>
      kpis
        ? [
            ["Total Campaigns", kpis.total],
            ["Active Campaigns", kpis.active],
            ["Leads Generated", kpis.leads],
            ["Qualified Leads", kpis.qualified],
            ["Follow-ups", kpis.followups],
            ["Deals Generated", kpis.deals],
            ["Won Deals", kpis.wonDeals],
            ["Conversion Rate", `${kpis.conversion}%`],
            ["Campaign Value", money(kpis.campaignValue)],
          ]
        : [],
    [kpis],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("crm.campaigns")}
        subtitle="Plan, track and measure your marketing campaigns."
        actions={
          <>
            <button type="button" className="rounded-xl border border-[#dbe7f5] bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={exportCsv}>
              Export
            </button>
            <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>
              + Create Campaign
            </button>
          </>
        }
      />
      {msg ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p> : null}
      {ok ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#e8eef6] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eef6] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row">
        <input
          className="h-11 flex-1 rounded-xl border border-[#e6eef8] px-4 text-sm"
          placeholder="Search campaigns..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="h-11 rounded-xl border border-[#e6eef8] px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create your first campaign to start generating leads."
          action={
            <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>
              + Create Campaign
            </button>
          }
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#e8eef6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <table className="gp-table min-w-[1100px]">
            <thead>
              <tr className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                <th>Campaign</th>
                <th>Source</th>
                <th>Status</th>
                <th>Dates</th>
                <th>Leads</th>
                <th>Qualified</th>
                <th>Follow-ups</th>
                <th>Deals</th>
                <th>Won</th>
                <th>Value</th>
                <th>Conv.</th>
                <th>Owner</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <button type="button" className="font-semibold text-slate-900" onClick={() => void openDetails(row)}>
                      {row.name}
                    </button>
                    <div className="text-xs text-slate-400">{row.createdAt ? formatDateBD(row.createdAt) : ""}</div>
                  </td>
                  <td className="text-sm">{row.source || "—"}</td>
                  <td>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold capitalize", badge(row.status))}>
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs text-slate-500">
                    {row.startsAt ? formatDateBD(row.startsAt) : "—"} → {row.endsAt ? formatDateBD(row.endsAt) : "—"}
                  </td>
                  <td>{row.stats?.leads ?? 0}</td>
                  <td>{row.stats?.qualified ?? 0}</td>
                  <td>{row.stats?.followups ?? 0}</td>
                  <td>{row.stats?.deals ?? 0}</td>
                  <td>{row.stats?.wonDeals ?? 0}</td>
                  <td className="text-xs">{money(row.stats?.pipelineValue || 0)}</td>
                  <td>{row.stats?.conversion ?? 0}%</td>
                  <td className="text-sm">{row.ownerName || "—"}</td>
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

      <Modal open={open} title={editing ? "Edit Campaign" : "Create Campaign"} onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Campaign Name *">
            <input className="gp-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Source / Channel *">
            <select className="gp-input" required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Status *">
            <select className="gp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Owner">
            <input className="gp-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </Field>
          <Field label="Start Date">
            <input className="gp-input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </Field>
          <Field label="End Date">
            <input className="gp-input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </Field>
          <Field label="Budget">
            <input className="gp-input" type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </Field>
          <Field label="Target Audience">
            <input className="gp-input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea className="gp-input min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea className="gp-input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!view} title="Campaign overview" onClose={() => setView(null)} wide>
        {view ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{view.name}</p>
                <p className="text-slate-500">{view.source} · {view.status}</p>
              </div>
              <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={() => setLeadOpen(true)}>
                + Add Lead to Campaign
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Leads", view.stats?.leads ?? leads.length],
                ["Qualified", view.stats?.qualified ?? 0],
                ["Follow-ups", view.stats?.followups ?? 0],
                ["Deals", view.stats?.deals ?? 0],
                ["Won", view.stats?.wonDeals ?? 0],
                ["Pipeline", money(view.stats?.pipelineValue || 0)],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-xl border border-[#e8eef6] bg-[#f8fafc] px-3 py-2">
                  <p className="text-[0.65rem] uppercase text-slate-400">{k}</p>
                  <p className="font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-600">{view.description || view.notes}</p>
            <div>
              <p className="mb-2 font-semibold">Leads</p>
              {leads.length === 0 ? (
                <p className="text-slate-400">No leads in this campaign yet.</p>
              ) : (
                <ul className="divide-y divide-[#eef2f7]">
                  {leads.map((l) => (
                    <li key={l._id} className="flex justify-between py-2">
                      <span>{l.name} <span className="text-slate-400">{l.mobile}</span></span>
                      <span className="text-xs uppercase text-slate-500">{l.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/crm/leads?q=${encodeURIComponent(view.name)}`} className="mt-2 inline-block text-sm font-semibold text-blue-600">
                Open in All Leads →
              </Link>
            </div>
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => openEdit(view)}>Edit campaign</button>
          </div>
        ) : null}
      </Modal>

      <Modal open={leadOpen} title="Add Lead to Campaign" onClose={() => setLeadOpen(false)}>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={addLead}>
          <Field label="Name *"><input className="gp-input" required value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} /></Field>
          <Field label="Phone *"><input className="gp-input" required value={leadForm.mobile} onChange={(e) => setLeadForm({ ...leadForm, mobile: e.target.value })} /></Field>
          <Field label="Email"><input className="gp-input" type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} /></Field>
          <Field label="Company"><input className="gp-input" value={leadForm.company} onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} /></Field>
          <Field label="Product"><input className="gp-input" value={leadForm.product} onChange={(e) => setLeadForm({ ...leadForm, product: e.target.value })} /></Field>
          <Field label="Owner"><input className="gp-input" value={leadForm.ownerName} onChange={(e) => setLeadForm({ ...leadForm, ownerName: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setLeadOpen(false)}>Cancel</button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>Save lead</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
