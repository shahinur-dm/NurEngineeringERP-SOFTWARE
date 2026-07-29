"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Field, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const t = useTranslations();
  const [business, setBusiness] = useState<Record<string, string> | null>(null);
  const [locations, setLocations] = useState<{ name: string; code: string; address?: string }[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  async function loadMeta() {
    const r = await fetch("/api/meta");
    const d = await r.json();
    setBusiness(d.business);
    setLocations(d.locations || []);
  }

  useEffect(() => {
    loadMeta();
  }, []);

  async function reseed() {
    const ok = confirm(
      "সব পুরনো ডেমো ডেটা মুছে নতুন ডামি ডেটা লোড হবে। চালিয়ে যাবেন?",
    );
    if (!ok) return;
    setSeeding(true);
    setSeedMsg("");
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (json.ok) {
        setSeedMsg(
          `সফল! প্রতিটি মডিউলে ${json.minPerModule || 50}+ ডেটা। পণ্য ${json.counts?.products}, গ্রাহক ${json.counts?.customers}, বিক্রি ${json.counts?.sales}, ক্রয় ${json.counts?.purchases}, লিড ${json.counts?.leads}`,
        );
        await loadMeta();
      } else {
        setSeedMsg("সিড ব্যর্থ হয়েছে");
      }
    } catch {
      setSeedMsg("নেটওয়ার্ক সমস্যা");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("settings.title")} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="gp-card space-y-3 p-5">
          <h2 className="text-xl font-bold">{t("settings.business")}</h2>
          <Field label={t("settings.businessName")}>
            <input className="gp-input" readOnly value={business?.name || ""} />
          </Field>
          <Field label={t("settings.address")}>
            <input className="gp-input" readOnly value={business?.address || ""} />
          </Field>
          <Field label={t("settings.phone")}>
            <input className="gp-input" readOnly value={business?.phone || ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="BIN">
              <input className="gp-input" readOnly value={business?.bin || ""} />
            </Field>
            <Field label="TIN">
              <input className="gp-input" readOnly value={business?.tin || ""} />
            </Field>
          </div>
          <Field label={t("settings.currency")}>
            <input className="gp-input" readOnly value={business?.currency || "BDT"} />
          </Field>
          <p className="rounded-xl bg-[var(--gp-primary-soft)] px-3 py-3 text-sm font-semibold text-primary">
            Asia/Dhaka · FIFO · বাংলা ডিফল্ট · BD ইনভয়েস (BIN/TIN/মূসক)
          </p>
        </div>

        <div className="space-y-5">
          <div className="gp-card p-5">
            <h2 className="mb-4 text-xl font-bold">{t("settings.locations")}</h2>
            <div className="space-y-3">
              {locations.map((l) => (
                <div key={l.code} className="rounded-xl border border-line px-4 py-3">
                  <p className="text-lg font-bold">{l.name}</p>
                  <p className="text-sm text-muted">
                    {l.code} · {l.address}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="gp-card space-y-3 p-5">
            <h2 className="text-xl font-bold">ডেমো ডেটা</h2>
            <p className="text-sm text-muted">
              সব পেজে নমুনা ডেটা লোড করতে নিচের বাটনে ক্লিক করুন (পুরনো ডেমো মুছে যাবে)।
            </p>
            <button
              type="button"
              className="gp-btn gp-btn-primary w-full"
              disabled={seeding}
              onClick={reseed}
            >
              {seeding ? "লোড হচ্ছে..." : "নতুন ডামি ডেটা লোড করুন"}
            </button>
            {seedMsg ? (
              <p className="rounded-xl bg-[var(--gp-primary-soft)] px-3 py-2 text-sm font-semibold text-primary">
                {seedMsg}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
