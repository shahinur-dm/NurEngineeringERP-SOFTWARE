"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_TREE, flattenNav, type NavItem } from "@/lib/navigation";

const NAV_HREFS = flattenNav().map((n) => n.href);

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
  const Icon = item.icon;
  const active = isNavActive(item.href, pathname);
  return (
    <Link
      href={item.href!}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[0.88rem] font-medium transition-colors duration-150",
          active
          ? "bg-[#14b8a6] text-white"
          : "text-[var(--gp-sidebar-ink)] hover:bg-white/10 hover:text-white",
      )}
    >
      {Icon ? (
        <Icon className={cn("h-[1.05rem] w-[1.05rem] shrink-0", active ? "text-white" : "text-[var(--gp-sidebar-muted)]")} />
      ) : null}
      <span className="truncate">{t(item.labelKey)}</span>
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
  const Icon = item.icon;
  const childActive = childIsActive(item, pathname);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-left text-[0.88rem] font-medium transition-colors duration-150",
          childActive || open
            ? "bg-white/10 text-white"
            : "text-[var(--gp-sidebar-ink)] hover:bg-white/10 hover:text-white",
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              "h-[1.05rem] w-[1.05rem] shrink-0",
              childActive || open ? "text-[#5eead4]" : "text-[var(--gp-sidebar-muted)]",
            )}
          />
        ) : null}
        <span className="flex-1 truncate">{t(item.labelKey)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
          {item.children?.map((child) => {
            if (!child.href) return null;
            const active = isNavActive(child.href, pathname);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-[0.82rem] font-medium transition-colors duration-150",
                  active
                    ? "bg-[#14b8a6] text-white"
                    : "text-[var(--gp-sidebar-muted)] hover:bg-white/10 hover:text-white",
                )}
              >
                {t(child.labelKey)}
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
    <nav className="erp-nav-scroll flex-1 space-y-0.5 px-2.5 py-3">
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
