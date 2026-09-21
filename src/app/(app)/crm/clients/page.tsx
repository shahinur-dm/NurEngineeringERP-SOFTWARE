"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, MapPin, Mail, Pencil, Phone, Trash2, Upload } from "lucide-react";
import { EmptyState, Modal, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

type Client = {
  _id: string;
  name: string;
  mobile?: string;
  email?: string;
  company?: string;
  leadId?: string;
  notes?: string;
  status?: string;
  campaignId?: string;
  campaignName?: string;
  dealId?: string;
  source?: string;
  ownerName?: string;
  photoUrl?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  hasPassword?: boolean;
};

type DealOpt = { _id: string; title: string; clientId?: string };

const empty = {
  name: "",
  company: "",
  email: "",
  mobile: "",
  password: "",
  website: "",
  status: "active",
  address: "",
  city: "",
  country: "",
  notes: "",
  photoUrl: "",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const labelCls = "mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500";
const inputCls =
  "h-11 w-full rounded-xl border border-[#dbe7f5] bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function CrmClientsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Client[]>([]);
  const [deals, setDeals] = useState<DealOpt[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (q) params.set("q", q);
      const [c, d] = await Promise.all([
        fetch(`/api/crm/clients?${params}`).then((r) => r.json()),
        fetch("/api/crm/deals?limit=400").then((r) => r.json()),
      ]);
      if (c.error) throw new Error(c.error);
      setRows(c.data || []);
      setDeals(d.data || []);
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [q, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const dealsByClient = useMemo(() => {
    const map: Record<string, DealOpt[]> = {};
    for (const deal of deals) {
      const key = deal.clientId || "";
      if (!key) continue;
      (map[key] ||= []).push(deal);
    }
    return map;
  }, [deals]);

  function openAdd() {
    setEditing(null);
    setForm(empty);
    setFormError("");
    setOpen(true);
  }

  function openEdit(row: Client) {
    setEditing(row);
    setForm({
      name: row.name || "",
      company: row.company || "",
      email: row.email || "",
      mobile: row.mobile || "",
      password: "",
      website: row.website || "",
      status: row.status || "active",
      address: row.address || "",
      city: row.city || "",
      country: row.country || "",
      notes: row.notes || "",
      photoUrl: row.photoUrl || "",
    });
    setFormError("");
    setOpen(true);
    setView(null);
  }

  function readPhoto(file: File) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setFormError("Use JPG, PNG, WebP or GIF.");
      return;
    }
    if (file.size > 2_000_000) {
      setFormError("Photo must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photoUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Enter a valid email.");
      return;
    }
    if (form.website.trim()) {
      const site = form.website.trim().startsWith("http") ? form.website.trim() : `https://${form.website.trim()}`;
      try {
        new URL(site);
      } catch {
        setFormError("Enter a valid website URL.");
        return;
      }
    }
    if (form.password && form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> = {
        name,
        company: form.company.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        website: form.website.trim(),
        status: form.status,
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        notes: form.notes.trim(),
        photoUrl: form.photoUrl,
      };
      if (form.password) payload.password = form.password;
      const res = await fetch(editing ? `/api/crm/clients/${editing._id}` : "/api/crm/clients", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setOpen(false);
      setOk(editing ? "Client updated." : "Client created.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("common.error"));
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

  const searchInput = "h-11 w-full rounded-xl border border-[#e6eef8] bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("crm.clients")}
        subtitle="Manage your client relationships."
        actions={
          <button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>
            + Add Client
          </button>
        }
      />
      {msg ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</p> : null}
      {ok ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p> : null}

      <div className="rounded-2xl border border-[#e8eef6] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <input className={searchInput} placeholder="Search by name, email, company..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <p className="text-muted">{t("common.loading")}</p> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Won deals can be converted into clients."
          action={<button type="button" className="gp-btn gp-btn-primary rounded-xl" onClick={openAdd}>+ Add Client</button>}
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const projects = dealsByClient[row._id] || [];
            const active = (row.status || "active") === "active";
            const place = [row.address, row.city, row.country].filter(Boolean).join(", ");
            return (
              <article
                key={row._id}
                className="flex min-h-[210px] flex-col rounded-2xl border border-[#e8eef6] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start gap-3">
                  {row.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3b5bfd] text-sm font-bold text-white">
                      {initials(row.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-900">{row.name}</h2>
                        <p className="truncate text-sm text-slate-500">{row.company || "—"}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                          active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  {row.mobile ? (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> {row.mobile}
                    </p>
                  ) : null}
                  {row.email ? (
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> {row.email}
                    </p>
                  ) : null}
                  {place ? (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {place}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-[#eef2f7] pt-3">
                  <div className="mb-2 flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                    <span>Projects</span>
                    <span className="normal-case text-blue-600">View all ({projects.length})</span>
                  </div>
                  {projects.length ? (
                    <span className="inline-block max-w-full truncate rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {projects[0].title}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No linked deals</span>
                  )}
                  {row.campaignName ? <p className="mt-2 text-xs text-slate-400">Campaign: {row.campaignName}</p> : null}
                </div>

                <div className="mt-auto flex items-center justify-end gap-3 pt-4 text-slate-400">
                  <button type="button" title="View" onClick={() => setView(row)} className="hover:text-blue-600">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button type="button" title="Edit" onClick={() => openEdit(row)} className="hover:text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" title="Delete" onClick={() => void onDelete(row._id)} className="hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <Modal open={open} title={editing ? "Edit Client" : "New Client"} onClose={() => !busy && setOpen(false)} fit>
        <form className="space-y-4" onSubmit={onSubmit}>
          {formError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}

          <div>
            <span className={labelCls}>Photo</span>
            <div
              className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#d5e2f2] bg-[#f8fbff] p-4"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) readPhoto(file);
              }}
              onPaste={(e) => {
                const file = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"))?.getAsFile();
                if (file) readPhoto(file);
              }}
            >
              {form.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#3b5bfd] text-xl font-bold text-white">
                  {initials(form.name || "U")}
                </span>
              )}
              <div className="min-w-0 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Upload className="h-4 w-4 text-slate-400" /> Upload photo
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Click to browse, drag & drop, or paste an image (Ctrl+V).</p>
                <p className="text-xs text-slate-400">PNG, JPG, WebP or GIF · up to 2 MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readPhoto(file);
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Name <span className="text-rose-500">*</span></span>
              <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Company</span>
              <input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Email</span>
              <input className={inputCls} type="email" placeholder="client@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Phone</span>
              <input className={inputCls} placeholder="01XXXXXXXXX" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Login password {editing ? "(optional)" : ""}</span>
            <input
              className={inputCls}
              type="password"
              autoComplete="new-password"
              placeholder={editing?.hasPassword ? "Leave blank to keep current password" : "min 6 chars (optional)"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-400">
              {editing ? "Password is never shown. Enter a new one only to change it." : "Set a password to store a hashed client login secret."}
            </p>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Website</span>
              <input className={inputCls} placeholder="http://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Status</span>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Address</span>
            <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>City</span>
              <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label className="block">
              <span className={labelCls}>Country</span>
              <input className={inputCls} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Notes</span>
            <textarea className={cn(inputCls, "h-24 py-2")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="flex justify-end gap-2 border-t border-[#eef2f7] pt-4">
            <button type="button" className="rounded-xl border border-[#e6eef8] px-4 py-2 text-sm font-semibold text-slate-600" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="gp-btn gp-btn-primary rounded-xl" disabled={busy}>
              {busy ? t("common.loading") : editing ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!view} title="Client details" onClose={() => setView(null)} fit>
        {view ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              {view.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3b5bfd] font-bold text-white">{initials(view.name)}</span>
              )}
              <div>
                <p className="font-semibold">{view.name}</p>
                <p className="text-slate-500">{view.company}</p>
              </div>
            </div>
            <p>Email: {view.email || "—"}</p>
            <p>Phone: {view.mobile || "—"}</p>
            <p>Website: {view.website || "—"}</p>
            <p>Status: {view.status || "active"}</p>
            <p>Address: {view.address || "—"}</p>
            <p>City: {view.city || "—"}</p>
            <p>Country: {view.country || "—"}</p>
            <p>{view.notes}</p>
            <button type="button" className="gp-btn gp-btn-primary" onClick={() => openEdit(view)}>Edit</button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
