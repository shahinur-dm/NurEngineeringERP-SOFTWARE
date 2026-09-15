"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  LogOut,
  Languages,
  Cpu,
  Menu,
} from "lucide-react";
import { NavSidebar } from "@/components/NavSidebar";

const MAX_IMAGE_BYTES = 800_000;

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("invalid"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("too_large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

export function AppShell({
  children,
  userName,
  role,
  logoUrl,
  avatarUrl,
  canUploadBranding,
}: {
  children: React.ReactNode;
  userName: string;
  role: string;
  logoUrl?: string;
  avatarUrl?: string;
  canUploadBranding?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [logo, setLogo] = useState(logoUrl || "");
  const [avatar, setAvatar] = useState(avatarUrl || "");
  const [imageError, setImageError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogo(logoUrl || "");
  }, [logoUrl]);

  useEffect(() => {
    setAvatar(avatarUrl || "");
  }, [avatarUrl]);

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

  async function persistLogo(dataUrl: string) {
    const res = await fetch("/api/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "business", logoUrl: dataUrl }),
    });
    if (!res.ok) {
      setImageError(locale === "bn" ? "লোগো সংরক্ষণ হয়নি" : "Could not save logo");
      return;
    }
    setLogo(dataUrl);
    router.refresh();
  }

  async function persistAvatar(dataUrl: string) {
    const res = await fetch("/api/meta", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "profile", avatarUrl: dataUrl }),
    });
    if (!res.ok) {
      setImageError(locale === "bn" ? "প্রোফাইল ছবি সংরক্ষণ হয়নি" : "Could not save profile image");
      return;
    }
    setAvatar(dataUrl);
    router.refresh();
  }

  async function onPick(kind: "logo" | "avatar", file?: File) {
    if (!file || !canUploadBranding) return;
    setImageError("");
    try {
      const dataUrl = await readImageFile(file);
      if (kind === "logo") {
        setLogo(dataUrl);
        await persistLogo(dataUrl);
      } else {
        setAvatar(dataUrl);
        await persistAvatar(dataUrl);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setImageError(
        code === "too_large"
          ? locale === "bn"
            ? "ছবি ৮০০KB এর কম হতে হবে"
            : "Image must be under 800KB"
          : locale === "bn"
            ? "শুধু ছবি ফাইল আপলোড করুন"
            : "Please upload an image file",
      );
    }
  }

  const initial = (userName || "A").trim().charAt(0).toUpperCase();
  const adminLabel = role === "admin" ? (locale === "bn" ? "সিস্টেম অ্যাডমিন" : "System Admin") : locale === "bn" ? "প্রশাসক" : "Signed in";

  const sidebarBody = (
    <>
      <div className="border-b border-white/10 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {canUploadBranding ? (
              <button
                type="button"
                className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2563eb] text-white"
                onClick={() => logoInputRef.current?.click()}
                title={locale === "bn" ? "কোম্পানি লোগো আপলোড" : "Upload company logo"}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-contain bg-white" />
                ) : (
                  <Cpu className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2563eb] text-white">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-contain bg-white" />
                ) : (
                  <Cpu className="h-4 w-4" />
                )}
              </div>
            )}
            <div className="min-w-0">
              <p className="gp-sidebar-brand truncate text-[0.88rem] font-bold leading-tight text-white">
                {t("app.name")}
              </p>
              <p className="mt-0.5 truncate text-[0.62rem] text-[var(--gp-sidebar-muted)]">
                {locale === "en" ? "EEE Equipment ERP" : "ইইই সরঞ্জাম ইআরপি"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPick("logo", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="px-3 pt-3 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--gp-sidebar-muted)]">
        {locale === "bn" ? "মডিউল" : "Modules"}
      </p>
      <NavSidebar />
      <div className="space-y-2 border-t border-white/10 bg-[var(--gp-sidebar-elevated)] p-2.5">
        {imageError ? <p className="px-1 text-[0.68rem] text-red-300">{imageError}</p> : null}
        <div className="flex items-center gap-2 rounded-xl px-1.5 py-1.5">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2563eb] text-xs font-bold text-white"
            onClick={() => canUploadBranding && avatarInputRef.current?.click()}
            title={canUploadBranding ? (locale === "bn" ? "প্রোফাইল ছবি আপলোড" : "Upload profile image") : userName}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </button>
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-semibold text-white">{userName}</p>
            <p className="truncate text-[0.62rem] text-[var(--gp-sidebar-muted)]">{adminLabel}</p>
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPick("avatar", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
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
          <aside className="absolute inset-y-0 left-0 flex w-[min(82vw,228px)] flex-col bg-[var(--gp-sidebar)] text-[var(--gp-sidebar-ink)] shadow-2xl">
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
