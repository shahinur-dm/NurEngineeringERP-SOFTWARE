"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_TREE, type NavItem } from "@/lib/navigation";

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations();
  const childActive = item.children?.some(
    (c) => c.href && (pathname === c.href || pathname.startsWith(c.href + "/")),
  );
  const [open, setOpen] = useState(!!childActive);

  if (!item.children?.length) {
    const Icon = item.icon;
    const active = item.href === pathname;
    return (
      <Link
        href={item.href!}
        className={cn(
          "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.9rem] font-medium transition",
          active
            ? "bg-[var(--gp-sidebar-active)] text-[var(--gp-primary)] shadow-sm ring-1 ring-[var(--gp-line-strong)]"
            : "text-[var(--gp-sidebar-ink)] hover:bg-white hover:text-[var(--gp-ink)]",
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              "h-[1.05rem] w-[1.05rem] shrink-0",
              active ? "text-[var(--gp-primary)]" : "text-[var(--gp-sidebar-muted)]",
            )}
          />
        ) : null}
        <span>{t(item.labelKey)}</span>
      </Link>
    );
  }

  const Icon = item.icon;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-[0.9rem] font-medium transition",
          childActive
            ? "bg-white text-[var(--gp-ink)]"
            : "text-[var(--gp-sidebar-ink)] hover:bg-white hover:text-[var(--gp-ink)]",
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              "h-[1.05rem] w-[1.05rem] shrink-0",
              childActive ? "text-[var(--gp-primary)]" : "text-[var(--gp-sidebar-muted)]",
            )}
          />
        ) : null}
        <span className="flex-1">{t(item.labelKey)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-line pl-2">
          {item.children.map((child) => {
            if (!child.href) return null;
            const active = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-[0.84rem] font-medium transition",
                  active
                    ? "bg-[var(--gp-sidebar-active)] text-[var(--gp-primary)]"
                    : "text-[var(--gp-sidebar-muted)] hover:bg-white hover:text-[var(--gp-ink)]",
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
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3 [scrollbar-color:rgba(100,116,139,0.25)_transparent] [scrollbar-width:thin]">
      {NAV_TREE.map((item) => (
        <NavGroup key={item.labelKey} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}
