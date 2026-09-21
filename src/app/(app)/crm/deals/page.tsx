"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Field, Modal, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

type Deal = {
  _id: string;
  title: string;
  value?: number;
  stage: string;
  clientId?: string;
  clientName?: string;
  leadId?: string;
  leadName?: string;
  notes?: string;
  campaignName?: string;
  ownerName?: string;
  company?: string;
  expectedClose?: string;
};

type Opt = { _id: string; name: string; company?: string; mobile?: string; email?: string; campaignId?: string; campaignName?: string; ownerName?: string };

const STAGES = [
  { id: "prospect", label: "Prospect", dot: "bg-sky-500" },
  { id: "qualified", label: "Qualified", dot: "bg-blue-600" },
  { id: "proposal", label: "Proposal", dot: "bg-violet-500" },
  { id: "negotiation", label: "Negotiation", dot: "bg-orange-500" },
  { id: "won", label: "Won", dot: "bg-emerald-500" },
  { id: "lost", label: "Lost", dot: "bg-rose-500" },
];

function money(n: number) {
  return `BDT ${Number(n || 0).toFixed(2)}`;
}

export default function CrmDealsPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Opt[]>([]);
  const [leads, setLeads] = useState<Opt[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [view, setView] = useState<Deal | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    value: "",
    stage: "prospect",
    clientId: "",
    leadId: "",
    notes: "",
    expectedClose: "",
  });
  const [prefillDone, setPrefillDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "400" });
      if (q) params.set("q", q);
      const [d, c, l] = await Promise.all([
        fetch(`/api/crm/deals?${params}`).then((r) => r.json()),
        fetch("/api/crm/clients?limit=300").then((r) => r.json()),
        fetch("/api/crm/leads?limit=300").then((r) => r.json()),
      ]);
      if (d.error) throw new Error(d.error);
      setRows(d.data || []);
      setClients(c.data || []);
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

  useEffect(() => {
    const leadId = searchParams.get("leadId");
    if (!prefillDone && leadId && leads.length) {
      const lead = leads.find((l) => l._id === leadId);
      setForm({
        title: lead ? `${lead.name} deal` : "",
        value: "",
        stage: "prospect",
        clientId: "",
        leadId,
        notes: "",
        expectedClose: "",
      });
      setOpen(true);
      setPrefillDone(true);
    }
  }, [searchParams, leads, prefillDone]);

  const grouped = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of STAGES) map[s.id] = [];
    for (const row of rows) {
      const stage = STAGES.some((s) => s.id === row.stage) ? row.stage : "prospect";
      map[stage].push(row);
    }
    return map;
  }, [rows]);

  function openAdd(stage = "prospect") {
    setEditing(null);
    setForm({ title: "", value: "", stage, clientId: "", leadId: "", notes: "", expectedClose: "" });
    setOpen(true);
  }

  function openEdit(row: Deal) {
    setEditing(row);
    setForm({
      title: row.title || "",
      value: String(row.value ?? ""),
      stage: row.stage || "prospect",
      clientId: row.clientId || "",
      leadId: row.leadId || "",
      notes: row.notes || "",
      expectedClose: row.expectedClose ? row.expectedClose.slice(0, 10) : "",
    });
    setOpen(true);
    setView(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setMsg("Title is required.");
      return;
    }
    setBusy(true);
    try {
      const client = clients.find((x) => x._id === form.clientId);
      const lead = leads.find((x) => x._id === form.leadId);
      const payload = {
        title: form.title,
        value: Number(form.value || 0),
        stage: form.stage,
        clientId: form.clientId,
        clientName: client?.name || "",
        leadId: form.leadId,
        leadName: lead?.name || "",
        notes: form.notes,
        expectedClose: form.expectedClose ? new Date(form.expectedClose).toISOString() : undefined,
      };
      const res = await fetch(editing ? `/api/crm/deals/${editing._id}` : "/api/crm/deals", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function moveStage(id: string, stage: string) {
    const res = await fetch(`/api/crm/deals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  async function convertClient(id: string) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/crm/deals/${id}/convert`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setView(null);
      await load();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this deal?")) return;
    const res = await fetch(`/api/crm/deals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("crm.deals")}
        subtitle="Drag deals between stages to track your sales process."
        actions={
          <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={() => openAdd()}>
            + New Deal
          </button>
        }
      />
      {msg ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p> : null}
      <input
        className="h-11 w-full max-w-md rounded-xl border border-[#e6eef8] bg-white px-4 text-sm"
        placeholder="Search deals..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}

      <div className="grid grid-cols-1 gap-3 overflow-x-auto md:grid-cols-2 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const list = grouped[stage.id] || [];
          const total = list.reduce((sum, d) => sum + Number(d.value || 0), 0);
          return (
            <div
              key={stage.id}
              className="flex min-h-[420px] min-w-[180px] flex-col rounded-2xl bg-[#f4f7fb] p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text");
                if (id) void moveStage(id, stage.id);
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className={cn("h-2.5 w-2.5 rounded-full", stage.dot)} />
                  {stage.label}
                  <span className="text-slate-400">{list.length}</span>
                </p>
                <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-blue-600" onClick={() => openAdd(stage.id)}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-3 text-xs font-medium text-slate-400">{money(total)}</p>
              <div className="flex flex-1 flex-col gap-2">
                {list.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d9e3ef] bg-white/50 px-3 py-8 text-center text-xs text-slate-400">
                    Drop deals here
                  </div>
                ) : (
                  list.map((deal) => (
                    <div
                      key={deal._id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", deal._id);
                        e.dataTransfer.setData("text", deal._id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab rounded-xl border border-[#e8eef6] bg-white p-3 shadow-sm"
                    >
                      <button type="button" className="text-left text-sm font-semibold text-slate-900" onClick={() => setView(deal)}>
                        {deal.title}
                      </button>
                      <p className="mt-1 text-xs font-medium text-slate-500">{money(deal.value || 0)}</p>
                      <p className="text-xs text-slate-400">{deal.clientName || deal.leadName || "—"}</p>
                      <p className="text-xs text-slate-400">{deal.company || deal.campaignName || ""}</p>
                      {deal.ownerName ? <p className="text-xs text-slate-400">{deal.ownerName}</p> : null}
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="text-xs font-semibold text-blue-600" onClick={() => openEdit(deal)}>
                          Edit
                        </button>
                        <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => void onDelete(deal._id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={open} title={editing ? "Edit Deal" : "New Deal"} onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Title">
            <input className="gp-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Value">
            <input className="gp-input" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </Field>
          <Field label="Stage">
            <select className="gp-input" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <select className="gp-input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">None</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Lead">
            <select className="gp-input" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}>
              <option value="">None</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Expected close">
            <input className="gp-input" type="date" value={form.expectedClose} onChange={(e) => setForm({ ...form, expectedClose: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea className="gp-input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!view} title="Deal details" onClose={() => setView(null)}>
        {view ? (
          <div className="space-y-2 text-sm">
            <p><b>{view.title}</b></p>
            <p>{money(view.value || 0)}</p>
            <p>Stage: {view.stage}</p>
            <p>{view.clientName || view.leadName}</p>
            <p>Campaign: {view.campaignName || "—"}</p>
            <p>{view.notes}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="gp-btn gp-btn-primary" onClick={() => openEdit(view)}>Edit</button>
              {view.stage === "won" ? (
                <button type="button" className="gp-btn gp-btn-ghost" disabled={busy} onClick={() => void convertClient(view._id)}>
                  Convert to Client
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
