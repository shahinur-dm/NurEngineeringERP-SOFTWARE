"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Cpu, CircuitBoard, Wrench, BarChart3, Zap } from "lucide-react";
import { animateIn, animateStagger } from "@/lib/gsap";

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("admin@ditpharma.bd");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const brandRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const featureRefs = useRef<HTMLLIElement[]>([]);

  useEffect(() => {
    animateIn(brandRef.current, { y: 28, duration: 0.55 });
    animateIn(formRef.current, { y: 24, delay: 0.12, duration: 0.5 });
    requestAnimationFrame(() => {
      animateStagger(featureRefs.current.filter(Boolean), { y: 14, stagger: 0.08 });
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      void fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error === "invalid" || res.status === 401
            ? t("auth.invalid")
            : t("common.error"),
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: CircuitBoard,
      text:
        locale === "en"
          ? "Catalog for motors, meters, kits & lab tools"
          : "মোটর, মিটার, কিট ও ল্যাব টুলসের ক্যাটালগ",
    },
    {
      icon: Wrench,
      text:
        locale === "en"
          ? "Fast POS for campus equipment sales"
          : "ক্যাম্পাস সরঞ্জাম বিক্রির দ্রুত পিওএস",
    },
    {
      icon: BarChart3,
      text:
        locale === "en"
          ? "Stock, invoices & reports in Bangla + English"
          : "স্টক, ইনভয়েস ও রিপোর্ট — বাংলা + English",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--gp-bg)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 12% 18%, rgba(30,107,184,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 88% 8%, rgba(13,148,136,0.07) 0%, transparent 50%), linear-gradient(180deg, #f8fafc 0%, #f5f7fa 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(30,107,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(30,107,184,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:items-center">
          <div ref={brandRef} className="text-[var(--gp-ink)]">
            <div className="mb-7 inline-flex items-center gap-3 rounded-2xl border border-line bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gp-primary)] text-white">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  EEE Equipment POS
                </p>
                <p className="text-sm font-semibold text-[var(--gp-ink)]">DIT POS</p>
              </div>
            </div>

            <h1 className="gp-display text-4xl font-bold leading-[1.12] text-[var(--gp-ink)] md:text-5xl lg:text-[3.25rem]">
              {t("app.name")}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted md:text-lg">
              {t("app.tagline")}
            </p>

            <ul className="mt-10 space-y-3.5">
              {features.map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  ref={(el) => {
                    if (el) featureRefs.current[i] = el;
                  }}
                  className="flex items-start gap-3 text-[0.95rem] text-[var(--gp-ink)]"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--gp-primary-soft)] text-[var(--gp-primary)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="pt-1.5 font-medium">{text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex items-center gap-2 text-sm text-muted">
              <Zap className="h-4 w-4 text-[var(--gp-accent)]" />
              <span>
                {locale === "en"
                  ? "Built for Electrical & Electronic Engineering students"
                  : "ইলেকট্রিক্যাল ও ইলেকট্রনিক্স ইঞ্জিনিয়ারিং শিক্ষার্থীদের জন্য"}
              </span>
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="gp-card-elevated border-line bg-white p-7 md:p-9"
          >
            <div className="mb-7 border-b border-line pb-5">
              <h2 className="gp-display text-2xl font-bold text-[var(--gp-ink)] md:text-3xl">
                {t("auth.welcome")}
              </h2>
              <p className="mt-1.5 text-muted">{t("auth.loginTitle")}</p>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-muted">{t("auth.email")}</span>
                <input
                  className="gp-input text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-muted">{t("auth.password")}</span>
                <input
                  type="password"
                  className="gp-input text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {error ? (
                <p className="rounded-xl border border-[#f5c2c2] bg-[#fef2f2] px-3 py-2.5 text-sm font-semibold text-danger">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="gp-btn gp-btn-primary w-full text-base"
              >
                {loading ? t("auth.loggingIn") : t("auth.login")}
              </button>
              <p className="text-center text-sm text-muted">{t("auth.demoHint")}</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
