"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { formatDateBD } from "@/lib/utils";

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

type LeadOpt = { _id: string; name: string };

const VIEWS = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming (7d)" },
  { id: "scheduled", label: "Scheduled" },
  { id: "ongoing", label: "Ongoing" },
  { id: "on_hold", label: "On Hold" },
  { id: "unreachable", label: "Unreachable" },
  { id: "completed", label: "Completed" },
  { id: "missed", label: "Missed" },
];

const ACTIONS = [
  { id: "completed", label: "Done" },
  { id: "ongoing", label: "Ongoing" },
  { id: "on_hold", label: "On Hold" },
  { id: "unreachable", label: "Unreachable" },
  { id: "missed", label: "Missed" },
];

export default function CrmFollowupsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<LeadOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [talk, setTalk] = useState<FollowUp | null>(null);
  const [talkText, setTalkText] = useState("");
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
      const [f, l] = await Promise.all([
        fetch(`/api/crm/followups?${params}`).then((r) => r.json()),
        fetch("/api/crm/leads?limit=300").then((r) => r.json()),
      ]);
      setRows(f.data || []);
      setLeads(l.data || []);
      await loadCounts();
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [view, q, t, loadCounts]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div>
      <PageHeader
        title={t("crm.followups")}
        subtitle="Stay on top of every lead conversation"
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={openAdd}>
            + Schedule Follow up
          </button>
        }
      />
      {msg ? <p className="mb-3 text-sm text-red-600">{msg}</p> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={view === v.id ? "gp-btn gp-btn-primary py-1 text-xs" : "gp-btn gp-btn-ghost py-1 text-xs"}
            onClick={() => setView(v.id)}
          >
            {v.label} {counts[v.id] ?? 0}
          </button>
        ))}
      </div>
      <input
        className="gp-input mb-4 max-w-sm"
        placeholder="Search by name or phone..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && rows.length === 0 ? <EmptyState message={t("common.noData")} /> : null}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row._id} className="gp-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {row.leadName || row.clientName || "Follow-up"}{" "}
                  <span className="text-xs font-normal text-muted">{row.status}</span>
                </p>
                <p className="text-sm text-muted">{formatDateBD(row.scheduledAt)}</p>
                {row.notes ? <p className="mt-1 text-sm">{row.notes}</p> : null}
                {(row.conversations || []).slice(-2).map((c, i) => (
                  <p key={i} className="mt-1 text-xs text-muted">
                    {c.text}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="gp-btn gp-btn-ghost px-2 py-1 text-xs"
                    onClick={() => void setStatus(row, a.id)}
                  >
                    {a.label}
                  </button>
                ))}
                <button type="button" className="gp-btn gp-btn-ghost px-2 py-1 text-xs" onClick={() => setTalk(row)}>
                  Add Conversation
                </button>
                <button type="button" className="gp-btn gp-btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(row)}>
                  Edit
                </button>
                <button type="button" className="gp-btn gp-btn-ghost px-2 py-1 text-xs" onClick={() => void onDelete(row._id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} title={editing ? "Edit follow-up" : "Schedule follow-up"} onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Lead">
            <select
              className="gp-input"
              value={form.leadId}
              onChange={(e) => setForm({ ...form, leadId: e.target.value })}
            >
              <option value="">Select lead</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date & time">
            <input
              className="gp-input"
              type="datetime-local"
              required
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select className="gp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {VIEWS.filter((v) => !["all", "overdue", "today", "upcoming"].includes(v.id)).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea className="gp-input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!talk} title="Add conversation" onClose={() => setTalk(null)}>
        <form className="grid gap-3" onSubmit={addConversation}>
          <textarea className="gp-input min-h-24" value={talkText} onChange={(e) => setTalkText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setTalk(null)}>
              Cancel
            </button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
