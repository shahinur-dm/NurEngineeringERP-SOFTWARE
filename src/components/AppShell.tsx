"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  LogOut,
  Languages,
  Cpu,
  Menu,
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
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <Menu className="h-5 w-5" />
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
    <div className="min-h-screen">
      {navOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close overlay"
            onClick={() => setNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,260px)] flex-col bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)] shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      ) : null}

      <button
        type="button"
        className="fixed left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-[var(--gp-ink)] shadow-sm transition-colors hover:bg-[var(--gp-primary-soft)]"
        onClick={() => setNavOpen((open) => !open)}
        aria-label={navOpen ? "Close menu" : "Open menu"}
        aria-expanded={navOpen}
      >
        <Menu className="h-5 w-5" />
      </button>
      <main className="min-w-0 px-3 pb-4 pt-3 pl-16 sm:px-4 sm:pl-16 lg:px-5 lg:pl-16">
        {children}
      </main>
    </div>
  );
}
