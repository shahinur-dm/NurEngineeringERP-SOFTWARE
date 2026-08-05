"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ShoppingCart,
  LogOut,
  Languages,
  Calculator,
  TrendingUp,
  Calendar,
  Cpu,
  Menu,
  X,
} from "lucide-react";
import { NavSidebar } from "@/components/NavSidebar";
import { CalculatorModal } from "@/components/CalculatorModal";

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
  const pathname = usePathname();
  const [calcOpen, setCalcOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNav]);

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

  const sidebarBody = (
    <>
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
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
          <button
            type="button"
            className="gp-btn gp-btn-ghost min-h-9 px-2 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
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
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-line bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)] lg:block">
        <div className="sticky top-0 flex h-screen flex-col">{sidebarBody}</div>
      </aside>

      {mobileNav ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close overlay"
            onClick={() => setMobileNav(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)] shadow-xl">
            {sidebarBody}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-white/85 px-4 py-3 backdrop-blur-md md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-10 px-2.5 lg:hidden"
                onClick={() => setMobileNav(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  {t("dashboard.welcome")}
                </p>
                <p className="gp-display truncate text-lg font-bold text-[var(--gp-ink)] md:text-xl">
                  {userName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/calendar" className="gp-btn gp-btn-ghost min-h-10">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.calendar")}</span>
              </Link>
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-10"
                onClick={() => setCalcOpen(true)}
                aria-label={locale === "bn" ? "ক্যালকুলেটর" : "Calculator"}
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
      <CalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}
