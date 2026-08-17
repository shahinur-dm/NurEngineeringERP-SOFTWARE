"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Cpu, CircuitBoard, Wrench, BarChart3, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "invalid" || res.status === 401) {
          setError(t("auth.invalid"));
        } else if (data.error === "db" || res.status === 503) {
          setError(t("auth.dbError"));
        } else {
          setError(t("common.error"));
        }
        return;
      }
      void fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(email, password);
  }

  function fillDemo() {
    const demoEmail = "admin@ditpharma.bd";
    const demoPassword = "admin123";
    setEmail(demoEmail);
    setPassword(demoPassword);
    void signIn(demoEmail, demoPassword);
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
    <div className="erp-login-grid bg-white">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1629] px-10 py-10 text-white md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#2563eb]/25" />
        <div className="relative">
          <div className="mb-14 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563eb] text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">Nur Engineering ERP</p>
              <p className="text-xs text-[#93c5fd]">EEE Equipment POS</p>
            </div>
          </div>
          <h1 className="max-w-md text-3xl font-bold leading-tight lg:text-4xl">
            {locale === "en" ? (
              <>
                Manage your entire <span className="text-[#60a5fa]">business</span> in one place
              </>
            ) : (
              t("app.name")
            )}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">{t("app.tagline")}</p>
          <ul className="mt-10 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb]/30 text-[#93c5fd]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">
          {locale === "en"
            ? "Built for Electrical & Electronic Engineering"
            : "ইলেকট্রিক্যাল ও ইলেকট্রনিক্স ইঞ্জিনিয়ারিংয়ের জন্য"}
        </p>
      </aside>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <form onSubmit={onSubmit} className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">{t("app.name")}</p>
              <p className="text-xs text-muted">EEE Equipment ERP</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[var(--gp-ink)] md:text-3xl">{t("auth.login")}</h2>
          <p className="mt-1.5 text-sm text-muted">{t("auth.loginTitle")}</p>

          <div className="mt-8 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted">
                {t("auth.email")}
              </span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className="gp-input gp-input-icon-left text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted">
                {t("auth.password")}
              </span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="gp-input gp-input-icon-both text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-[var(--gp-ink)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            {error ? (
              <p className="rounded-xl border border-[#f5c2c2] bg-[#fef2f2] px-3 py-2.5 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={loading} className="gp-btn gp-btn-primary w-full text-base">
              {loading ? t("auth.loggingIn") : t("auth.login")}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full rounded-xl border border-line bg-[#f8fafc] px-4 py-3 text-left"
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted">
                {locale === "bn" ? "ডেমো লগইন" : "Quick demo login"}
              </p>
              <p className="mt-1 text-sm text-[var(--gp-ink)]">{t("auth.demoHint")}</p>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
