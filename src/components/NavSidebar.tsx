"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_TREE, flattenNav, type NavItem } from "@/lib/navigation";

const NAV_HREFS = flattenNav().map((n) => n.href);

function navLabel(t: ReturnType<typeof useTranslations>, locale: string, key: string) {
  try {
    const value = t(key);
    if (value && value !== key) return value;
  } catch {
    /* missing key */
  }
  if (key === "nav.challanList") return locale === "bn" ? "সব চালান" : "All Challan";
  return key;
}

/** Longest matching href wins so /sales and /sales/quotations cannot both be active. */
function isNavActive(href: string | undefined, pathname: string) {
  if (!href) return false;
  if (pathname === href) return true;
  if (href === "/") return false;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !NAV_HREFS.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}

function childIsActive(item: NavItem, pathname: string) {
  return !!item.children?.some((c) => isNavActive(c.href, pathname));
}

function NavLeaf({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const Icon = item.icon;
  const active = isNavActive(item.href, pathname);
  return (
    <Link
      href={item.href!}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-[0.84rem] font-medium tracking-[-0.005em] transition-all duration-150",
          active
          ? "border-white/10 bg-[#2563eb] text-white shadow-sm"
          : "text-[#b8c2d3] hover:border-white/5 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      {Icon ? (
        <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.7]", active ? "text-white" : "text-[#8491a7] group-hover:text-[#c7d2e3]")} />
      ) : null}
      <span className="truncate">{navLabel(t, locale, item.labelKey)}</span>
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  open,
  onToggle,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const Icon = item.icon;
  const childActive = childIsActive(item, pathname);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex min-h-10 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-left text-[0.84rem] font-medium tracking-[-0.005em] transition-all duration-150",
          childActive || open
            ? "border-white/5 bg-white/10 text-white"
            : "text-[#b8c2d3] hover:border-white/5 hover:bg-white/[0.07] hover:text-white",
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 stroke-[1.7]",
              childActive || open ? "text-[#60a5fa]" : "text-[#8491a7]",
            )}
          />
        ) : null}
        <span className="flex-1 truncate">{navLabel(t, locale, item.labelKey)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="ml-[1.15rem] mt-1 space-y-0.5 border-l border-white/10 pl-2.5">
          {item.children?.map((child) => {
            if (!child.href) return null;
            const active = isNavActive(child.href, pathname);
            const ChildIcon = child.icon || item.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex min-h-8 items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[0.79rem] font-medium tracking-[-0.005em] transition-all duration-150",
                  active
                    ? "border-white/10 bg-[#2563eb] text-white shadow-sm"
                    : "text-[#94a1b5] hover:border-white/5 hover:bg-white/[0.07] hover:text-[#e5eaf2]",
                )}
              >
                {ChildIcon ? (
                  <ChildIcon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.7]", active ? "text-white" : "text-[#738198]")} />
                ) : null}
                <span className="truncate">{navLabel(t, locale, child.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function NavSidebar() {
  const pathname = usePathname();
  const activeGroup =
    NAV_TREE.find((item) => item.children?.length && childIsActive(item, pathname))?.labelKey ?? null;
  const [openKey, setOpenKey] = useState<string | null>(activeGroup);

  useEffect(() => {
    setOpenKey(activeGroup);
  }, [pathname, activeGroup]);

  return (
    <nav className="erp-nav-scroll flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
      {NAV_TREE.map((item) => {
        if (!item.children?.length) {
          return <NavLeaf key={item.labelKey} item={item} pathname={pathname} />;
        }
        return (
          <NavGroup
            key={item.labelKey}
            item={item}
            pathname={pathname}
            open={openKey === item.labelKey}
            onToggle={() => setOpenKey((prev) => (prev === item.labelKey ? null : item.labelKey))}
          />
        );
      })}
    </nav>
  );
}
