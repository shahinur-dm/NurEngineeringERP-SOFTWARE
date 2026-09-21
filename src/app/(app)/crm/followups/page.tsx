"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

type FollowUp = {
  _id: string;
  leadId?: string;
  leadName?: string;
  clientName?: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  conversations?: { at: string; text: string; userName?: string }[];
};

type LeadOpt = { _id: string; name: string; mobile?: string; status?: string; company?: string; campaignId?: string; campaignName?: string; ownerName?: string };

const VIEWS = [
  { id: "all", label: "All", cls: "bg-blue-600 text-white" },
  { id: "overdue", label: "Overdue", cls: "bg-rose-50 text-rose-700" },
  { id: "today", label: "Today", cls: "bg-white text-slate-700" },
  { id: "upcoming", label: "Upcoming (7d)", cls: "bg-white text-slate-700" },
  { id: "scheduled", label: "Scheduled", cls: "bg-white text-slate-700" },
  { id: "ongoing", label: "Ongoing", cls: "bg-white text-slate-700" },
  { id: "on_hold", label: "On Hold", cls: "bg-white text-slate-700" },
  { id: "unreachable", label: "Unreachable", cls: "bg-white text-slate-700" },
  { id: "completed", label: "Completed", cls: "bg-white text-slate-700" },
  { id: "missed", label: "Missed", cls: "bg-white text-slate-700" },
];

const ACTIONS = [
  { id: "completed", label: "Done", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { id: "ongoing", label: "Ongoing", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  { id: "on_hold", label: "On Hold", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "unreachable", label: "Unreachable", cls: "border-slate-200 bg-slate-50 text-slate-600" },
  { id: "missed", label: "Missed", cls: "border-rose-200 bg-rose-50 text-rose-700" },
];

function monthDay(iso: string) {
  const d = new Date(iso);
  return {
    mon: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    time: d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

export default function CrmFollowupsPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<LeadOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [timeBand, setTimeBand] = useState("all");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [talk, setTalk] = useState<FollowUp | null>(null);
  const [talkText, setTalkText] = useState("");
  const [prefillDone, setPrefillDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    leadId: "",
    leadName: "",
    scheduledAt: "",
    status: "scheduled",
    notes: "",
  });

  const loadCounts = useCallback(async () => {
    const next: Record<string, number> = {};
    await Promise.all(
      VIEWS.map(async (v) => {
        const res = await fetch(`/api/crm/followups?view=${v.id}&limit=1`);
        const json = await res.json();
        next[v.id] = json.total || 0;
      }),
    );
    setCounts(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "300", view });
      if (q) params.set("q", q);
      if (from) {
        params.set("from", from);
        params.set("to", from);
      }
      const [f, l] = await Promise.all([
        fetch(`/api/crm/followups?${params}`).then((r) => r.json()),
        fetch("/api/crm/leads?limit=300").then((r) => r.json()),
      ]);
      if (f.error) throw new Error(f.error);
      setRows(f.data || []);
      setLeads(l.data || []);
      await loadCounts();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [view, q, from, t, loadCounts]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const leadId = searchParams.get("leadId");
    if (!prefillDone && leadId && leads.length) {
      setForm((f) => ({ ...f, leadId, scheduledAt: f.scheduledAt || new Date().toISOString().slice(0, 16) }));
      setOpen(true);
      setPrefillDone(true);
    }
  }, [searchParams, leads.length, prefillDone]);

  const leadById = useMemo(() => Object.fromEntries(leads.map((l) => [l._id, l])), [leads]);

  const visible = useMemo(() => {
    if (timeBand === "all") return rows;
    return rows.filter((row) => {
      const h = new Date(row.scheduledAt).getHours();
      if (timeBand === "morning") return h < 12;
      if (timeBand === "afternoon") return h >= 12 && h < 17;
      if (timeBand === "evening") return h >= 17;
      return true;
    });
  }, [rows, timeBand]);

  function openAdd() {
    setEditing(null);
    setForm({
      leadId: "",
      leadName: "",
      scheduledAt: new Date().toISOString().slice(0, 16),
      status: "scheduled",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(row: FollowUp) {
    setEditing(row);
    setForm({
      leadId: row.leadId || "",
      leadName: row.leadName || "",
      scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString().slice(0, 16) : "",
      status: row.status || "scheduled",
      notes: row.notes || "",
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.scheduledAt) {
      setMsg("Date and time are required.");
      return;
    }
    setBusy(true);
    try {
      const lead = leads.find((x) => x._id === form.leadId);
      const payload = {
        ...form,
        leadName: lead?.name || form.leadName,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      };
      const res = await fetch(editing ? `/api/crm/followups/${editing._id}` : "/api/crm/followups", {
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

  async function setStatus(row: FollowUp, status: string) {
    const res = await fetch(`/api/crm/followups/${row._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  async function addConversation(e: FormEvent) {
    e.preventDefault();
    if (!talk || !talkText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/crm/followups/${talk._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: talkText.trim() }),
      });
      if (!res.ok) throw new Error("error");
      setTalkText("");
      setTalk(null);
      await load();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this follow-up?")) return;
    const res = await fetch(`/api/crm/followups/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg(t("common.error"));
      return;
    }
    await load();
  }

  const sel = "h-11 rounded-xl border border-[#e6eef8] bg-white px-3 text-sm text-slate-700";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("crm.followups")}
        subtitle="Stay on top of every lead conversation"
        actions={
          <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>
            + Schedule Follow-up
          </button>
        }
      />
      {msg ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p> : null}

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
              view === v.id ? "border-blue-600 bg-blue-600 text-white" : "border-[#e6eef8] bg-white text-slate-600",
            )}
            onClick={() => setView(v.id)}
          >
            {v.label} <span>{counts[v.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] lg:flex-row">
        <input
          className={cn(sel, "flex-1")}
          placeholder="Search by name or phone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input className={sel} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <select className={sel} value={timeBand} onChange={(e) => setTimeBand(e.target.value)}>
          <option value="all">All Times</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>

      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && visible.length === 0 ? (
        <EmptyState
          title="No follow-ups in this view"
          description="Schedule a follow-up from a lead conversation."
          action={<button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>+ Schedule Follow-up</button>}
        />
      ) : null}

      <div className="space-y-3">
        {visible.map((row) => {
          const md = monthDay(row.scheduledAt);
          const lead = row.leadId ? leadById[row.leadId] : undefined;
          return (
            <div key={row._id} className="rounded-2xl border border-[#e8eef6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-14 w-12 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <span className="text-[0.65rem] font-bold">{md.mon}</span>
                  <span className="text-lg font-bold leading-none">{md.day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{row.leadName || row.clientName || "Follow-up"}</p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-emerald-700">
                      {row.status}
                    </span>
                    {lead?.status ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-slate-600">
                        {lead.status}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {md.mon} {md.day}, {new Date(row.scheduledAt).getFullYear()}, {md.time}
                    {lead?.name ? ` · ${lead.name}` : ""}
                    {lead?.mobile ? ` · ${lead.mobile}` : ""}
                  </p>
                  {row.notes ? <p className="mt-1 text-sm text-slate-600">{row.notes}</p> : null}
                  {(row.conversations || []).slice(-2).map((c, i) => (
                    <p key={i} className="mt-1 text-xs text-slate-400">{c.text}</p>
                  ))}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={cn("rounded-full border px-3 py-1 text-xs font-semibold", a.cls)}
                        onClick={() => void setStatus(row, a.id)}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                      onClick={() => setTalk(row)}
                    >
                      Add Conversation
                    </button>
                    <button type="button" className="rounded-full border px-3 py-1 text-xs font-semibold" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button type="button" className="rounded-full border px-3 py-1 text-xs font-semibold text-rose-600" onClick={() => void onDelete(row._id)}>
                      Delete
                    </button>
                  </div>
                </div>
                {row.leadId ? (
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <Link href={`/crm/leads?q=${encodeURIComponent(row.leadName || "")}`} className="text-sm font-semibold text-blue-600">
                      Open lead →
                    </Link>
                    <Link href={`/crm/deals?leadId=${row.leadId}`} className="text-xs font-semibold text-slate-500">
                      Create Deal
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} title={editing ? "Edit follow-up" : "Schedule follow-up"} onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Lead">
            <select
              className="gp-input"
              value={form.leadId}
              onChange={(e) => {
                const id = e.target.value;
                const lead = leads.find((x) => x._id === id);
                setForm({
                  ...form,
                  leadId: id,
                  leadName: lead?.name || "",
                });
              }}
            >
              <option value="">Select lead</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name} {l.mobile ? `(${l.mobile})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date & time">
            <input className="gp-input" type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="gp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {VIEWS.filter((v) => !["all", "overdue", "today", "upcoming"].includes(v.id)).map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
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

      <Modal open={!!talk} title="Add conversation" onClose={() => setTalk(null)}>
        <form className="grid gap-3" onSubmit={addConversation}>
          <textarea className="gp-input min-h-24" value={talkText} onChange={(e) => setTalkText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setTalk(null)}>Cancel</button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
