"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ShoppingCart,
  LogOut,
  Languages,
  Calculator,
  TrendingUp,
  Calendar,
  Cpu,
} from "lucide-react";
import { NavSidebar } from "@/components/NavSidebar";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  async function switchLocale() {
    const next = locale === "bn" ? "en" : "bn";
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-line bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)]">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-line px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gp-primary)] text-white shadow-sm">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="gp-sidebar-brand truncate text-lg font-bold leading-tight text-[var(--gp-ink)]">
                  {t("app.name")}
                </p>
                <p className="mt-0.5 truncate text-[0.7rem] text-[var(--gp-sidebar-muted)]">
                  {locale === "en" ? "EEE Equipment ERP" : "ইইই সরঞ্জাম ইআরপি"}
                </p>
              </div>
            </div>
          </div>
          <NavSidebar />
          <div className="space-y-2 border-t border-line bg-[var(--gp-sidebar-elevated)] p-3.5">
            <div className="rounded-xl border border-line bg-[var(--gp-bg)] px-3 py-2.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--gp-sidebar-muted)]">
                {locale === "bn" ? "ব্যবহারকারী" : "Signed in"}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[var(--gp-ink)]">{userName}</p>
            </div>
            <button
              type="button"
              onClick={switchLocale}
              className="gp-btn gp-btn-ghost w-full justify-start"
            >
              <Languages className="h-4 w-4" />
              {locale === "bn" ? "English" : "বাংলা"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="gp-btn gp-btn-primary w-full justify-start"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-white/85 px-4 py-3 backdrop-blur-md md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">
                {t("dashboard.welcome")}
              </p>
              <p className="gp-display text-lg font-bold text-[var(--gp-ink)] md:text-xl">
                {userName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/calendar" className="gp-btn gp-btn-ghost min-h-10">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.calendar")}</span>
              </Link>
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-10"
                onClick={() =>
                  alert(locale === "bn" ? "ক্যালকুলেটর শীঘ্রই" : "Calculator coming soon")
                }
              >
                <Calculator className="h-4 w-4" />
              </button>
              <Link href="/reports/profit-loss" className="gp-btn gp-btn-ghost min-h-10">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.todayProfit")}</span>
              </Link>
              <Link href="/pos" className="gp-btn gp-btn-primary min-h-10 px-4 text-[0.95rem]">
                <ShoppingCart className="h-4 w-4" />
                {t("nav.pos")}
              </Link>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 md:px-7 md:py-7">{children}</main>
      </div>
    </div>
  );
}
