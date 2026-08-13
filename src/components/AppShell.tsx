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

  const initial = (userName || "A").trim().charAt(0).toUpperCase();

  const sidebarBody = (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="gp-sidebar-brand truncate text-[0.95rem] font-bold leading-tight text-white">
                {t("app.name")}
              </p>
              <p className="mt-0.5 truncate text-[0.68rem] text-[var(--gp-sidebar-muted)]">
                {locale === "en" ? "EEE Equipment ERP" : "ইইই সরঞ্জাম ইআরপি"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 md:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <p className="px-4 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--gp-sidebar-muted)]">
        {locale === "bn" ? "মডিউল" : "Modules"}
      </p>
      <NavSidebar />
      <div className="space-y-2 border-t border-white/10 bg-[var(--gp-sidebar-elevated)] p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="text-[0.68rem] text-[var(--gp-sidebar-muted)]">
              {locale === "bn" ? "প্রশাসক" : "Signed in"}
            </p>
          </div>
        </div>
        <button type="button" onClick={switchLocale} className="erp-side-btn">
          <Languages className="h-4 w-4" />
          {locale === "bn" ? "English" : "বাংলা"}
        </button>
        <button type="button" onClick={logout} className="erp-side-btn erp-side-btn-primary">
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)] md:block">
        <div className="sticky top-0 flex h-screen flex-col">{sidebarBody}</div>
      </aside>

      {mobileNav ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close overlay"
            onClick={() => setMobileNav(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,300px)] flex-col bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)] shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-white px-4 py-3 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="gp-btn gp-btn-ghost min-h-10 px-2.5 md:hidden"
                onClick={() => setMobileNav(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-[var(--gp-ink)] md:text-lg">
                  {locale === "bn" ? `স্বাগতম, ${userName}` : `Welcome back, ${userName}`}
                </p>
                <p className="text-[0.75rem] text-muted">{t("dashboard.welcome")}</p>
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
              <Link href="/sales/quotations" className="gp-btn gp-btn-ghost min-h-10 px-3 text-[0.95rem]">
                {t("nav.listQuotations")}
              </Link>
              <Link href="/sales" className="gp-btn gp-btn-ghost min-h-10 px-3 text-[0.95rem]">
                {t("nav.allSales")}
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
