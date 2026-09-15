"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { AlertBanner, Field, Modal, PageHeader } from "@/components/ui";
import { applySiteFavicon } from "@/components/SiteFavicon";

type Business = {
  name?: string;
  nameBn?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bin?: string;
  tin?: string;
  currency?: string;
  invoicePrefix?: string;
  logoUrl?: string;
  faviconUrl?: string;
};

type LocationRow = {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
};

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [business, setBusiness] = useState<Business>({});
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", code: "", address: "", phone: "" });

  const loadMeta = useCallback(async () => {
    const r = await fetch("/api/meta");
    const d = await r.json();
    setBusiness(d.business || {});
    setLocations(d.locations || []);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  async function saveBusiness(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "business", ...business }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setBanner({
          tone: "error",
          message:
            j.error === "forbidden"
              ? locale === "bn"
                ? "সেটিংস পরিবর্তনের অনুমতি নেই"
                : "No permission to change settings"
              : t("common.error"),
        });
        return;
      }
      setBanner({
        tone: "success",
        message: locale === "bn" ? "সেটিংস সংরক্ষিত" : "Settings saved",
      });
      applySiteFavicon();
      await loadMeta();
    } catch {
      setBanner({ tone: "error", message: t("common.error") });
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "location", ...locForm }),
    });
    if (!res.ok) {
      setBanner({ tone: "error", message: t("common.error") });
      return;
    }
    setLocOpen(false);
    setLocForm({ name: "", code: "", address: "", phone: "" });
    setBanner({
      tone: "success",
      message: locale === "bn" ? "লোকেশন যোগ হয়েছে" : "Location added",
    });
    await loadMeta();
  }

  async function deleteLocation(id: string) {
    if (!confirm(locale === "bn" ? "লোকেশন মুছবেন?" : "Delete location?")) return;
    await fetch(`/api/meta?locationId=${id}`, { method: "DELETE" });
    await loadMeta();
  }

  async function reseed() {
    const ok = confirm(
      locale === "bn"
        ? "সব পুরনো ডেমো ডেটা মুছে নতুন ডামি ডেটা লোড হবে। চালিয়ে যাবেন?"
        : "This will wipe demo data and reseed. Continue?",
    );
    if (!ok) return;
    setSeeding(true);
    setBanner(null);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (json.ok) {
        setBanner({
          tone: "success",
          message:
            locale === "bn"
              ? `সফল! পণ্য ${json.counts?.products}, গ্রাহক ${json.counts?.customers}, বিক্রি ${json.counts?.sales}`
              : `Reseeded: ${json.counts?.products} products, ${json.counts?.sales} sales`,
        });
        await loadMeta();
      } else {
        setBanner({
          tone: "error",
          message:
            json.error === "forbidden"
              ? locale === "bn"
                ? "শুধু অ্যাডমিন রিসিড করতে পারে"
                : "Only admin can reseed"
              : t("common.error"),
        });
      }
    } catch {
      setBanner({ tone: "error", message: t("common.error") });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("settings.title")} />
      {banner ? (
        <AlertBanner tone={banner.tone} message={banner.message} onClose={() => setBanner(null)} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={saveBusiness} className="gp-card space-y-3 p-5">
          <h2 className="text-xl font-bold">{t("settings.business")}</h2>
          <Field label={t("settings.businessName")}>
            <input
              className="gp-input"
              required
              value={business.name || ""}
              onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))}
            />
          </Field>
          <Field label={t("settings.address")}>
            <input
              className="gp-input"
              value={business.address || ""}
              onChange={(e) => setBusiness((b) => ({ ...b, address: e.target.value }))}
            />
          </Field>
          <Field label={t("settings.phone")}>
            <input
              className="gp-input"
              value={business.phone || ""}
              onChange={(e) => setBusiness((b) => ({ ...b, phone: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              className="gp-input"
              type="email"
              value={business.email || ""}
              onChange={(e) => setBusiness((b) => ({ ...b, email: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "ওয়েবসাইট" : "Website"}>
            <input
              className="gp-input"
              value={business.website || ""}
              onChange={(e) => setBusiness((b) => ({ ...b, website: e.target.value }))}
              placeholder="https://"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="BIN">
              <input
                className="gp-input"
                value={business.bin || ""}
                onChange={(e) => setBusiness((b) => ({ ...b, bin: e.target.value }))}
              />
            </Field>
            <Field label="TIN">
              <input
                className="gp-input"
                value={business.tin || ""}
                onChange={(e) => setBusiness((b) => ({ ...b, tin: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("settings.currency")}>
              <input
                className="gp-input"
                value={business.currency || "BDT"}
                onChange={(e) => setBusiness((b) => ({ ...b, currency: e.target.value }))}
              />
            </Field>
            <Field label={locale === "bn" ? "ইনভয়েস প্রিফিক্স" : "Invoice prefix"}>
              <input
                className="gp-input"
                value={business.invoicePrefix || ""}
                onChange={(e) => setBusiness((b) => ({ ...b, invoicePrefix: e.target.value }))}
              />
            </Field>
          </div>
          <Field label={locale === "bn" ? "ডকুমেন্ট লোগো" : "Document logo"}>
            <input
              className="gp-input"
              value={business.logoUrl || ""}
              onChange={(e) => setBusiness((b) => ({ ...b, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
            <input
              type="file"
              accept="image/*"
              className="mt-2 text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setBusiness((b) => ({ ...b, logoUrl: String(reader.result || "") }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {business.logoUrl ? (
              <div className="mt-2 flex h-20 w-20 items-center justify-center rounded-lg border border-line bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={business.logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">
                {locale === "bn"
                  ? "আপলোড করলে Quotation, Bill ও Challan-এ ব্যবহার হবে"
                  : "Uploaded logo is used on Quotation, Bill and Challan"}
              </p>
            )}
          </Field>
          <Field label={locale === "bn" ? "ফেভিকন" : "Favicon"}>
            <input
              type="file"
              accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg,image/webp,.ico"
              className="mt-1 text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 200_000) {
                  setBanner({
                    tone: "error",
                    message: locale === "bn" ? "ফেভিকন ২০০KB এর কম হতে হবে" : "Favicon must be under 200KB",
                  });
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setBusiness((b) => ({ ...b, faviconUrl: String(reader.result || "") }));
                };
                reader.readAsDataURL(file);
              }}
            />
            {business.faviconUrl ? (
              <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={business.faviconUrl} alt="Favicon preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">
                {locale === "bn"
                  ? "ব্রাউজার ট্যাবে দেখানো ছোট আইকন"
                  : "Small icon shown in the browser tab"}
              </p>
            )}
          </Field>
          <button type="submit" className="gp-btn gp-btn-primary w-full" disabled={saving}>
            {saving ? t("app.loading") : t("common.save")}
          </button>
        </form>

        <div className="space-y-5">
          <div className="gp-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("settings.locations")}</h2>
              <button
                type="button"
                className="gp-btn gp-btn-primary min-h-9 px-3"
                onClick={() => setLocOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("common.add")}
              </button>
            </div>
            <div className="space-y-3">
              {locations.map((l) => (
                <div
                  key={l._id || l.code}
                  className="flex items-start justify-between gap-2 rounded-xl border border-line px-4 py-3"
                >
                  <div>
                    <p className="text-lg font-bold">{l.name}</p>
                    <p className="text-sm text-muted">
                      {l.code} · {l.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gp-btn gp-btn-ghost min-h-8 px-2 text-[var(--gp-danger)]"
                    onClick={() => deleteLocation(l._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="gp-card space-y-3 p-5">
            <h2 className="text-xl font-bold">
              {locale === "bn" ? "ডেমো ডেটা" : "Demo data"}
            </h2>
            <p className="text-sm text-muted">
              {locale === "bn"
                ? "অ্যাডমিন হিসেবে সব পেজে নমুনা ডেটা লোড করতে নিচের বাটনে ক্লিক করুন।"
                : "Admin only: wipe and reload sample data for all modules."}
            </p>
            <button
              type="button"
              className="gp-btn gp-btn-primary w-full"
              disabled={seeding}
              onClick={reseed}
            >
              {seeding
                ? t("app.loading")
                : locale === "bn"
                  ? "নতুন ডামি ডেটা লোড করুন"
                  : "Reload demo data"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={locOpen}
        title={locale === "bn" ? "নতুন লোকেশন" : "Add location"}
        onClose={() => setLocOpen(false)}
      >
        <form onSubmit={saveLocation} className="grid gap-3">
          <Field label={locale === "bn" ? "নাম" : "Name"}>
            <input
              className="gp-input"
              required
              value={locForm.name}
              onChange={(e) => setLocForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "কোড" : "Code"}>
            <input
              className="gp-input"
              required
              value={locForm.code}
              onChange={(e) => setLocForm((f) => ({ ...f, code: e.target.value }))}
            />
          </Field>
          <Field label={t("settings.address")}>
            <input
              className="gp-input"
              value={locForm.address}
              onChange={(e) => setLocForm((f) => ({ ...f, address: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setLocOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="gp-btn gp-btn-primary">
              {t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
