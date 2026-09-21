"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  if (key === "nav.sellReturnForm") return locale === "bn" ? "সেল রিটার্ন" : "Sell Return";
  if (key === "nav.sellReturnList") return locale === "bn" ? "সেল রিটার্ন তালিকা" : "Sell Return List";
  if (key === "nav.accountsDashboard") return locale === "bn" ? "হিসাব ড্যাশবোর্ড" : "Accounts Dashboard";
  if (key === "nav.customerPayment") return locale === "bn" ? "কাস্টমার পেমেন্ট" : "Customer Payment";
  if (key === "nav.supplierPayment") return locale === "bn" ? "সাপ্লায়ার পেমেন্ট" : "Supplier Payment";
  if (key === "nav.allLeads") return locale === "bn" ? "সব লিড" : "All Leads";
  if (key === "nav.clients") return locale === "bn" ? "ক্লায়েন্ট" : "Clients";
  if (key === "nav.dealsPipeline") return locale === "bn" ? "ডিল পাইপলাইন" : "Deals Pipeline";
  return key;
}

/** Longest matching href wins so /sales and /sales/quotations cannot both be active. */
function isNavActive(href: string | undefined, pathname: string, posMode?: string | null) {
  if (!href) return false;
  if (pathname === "/pos") {
    if (posMode === "challan") return href === "/sales/challans";
    return href === "/pos";
  }
  if (href === "/sales/returns" && pathname.startsWith("/sales/returns/")) return false;
  if (href === "/sales/returns/add" && pathname.startsWith("/sales/returns/") && pathname !== "/sales/returns") {
    return true;
  }
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

function childIsActive(item: NavItem, pathname: string, posMode?: string | null): boolean {
  return !!item.children?.some(
    (c) => isNavActive(c.href, pathname, posMode) || childIsActive(c, pathname, posMode),
  );
}

function NavLeaf({ item, pathname, posMode }: { item: NavItem; pathname: string; posMode?: string | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const Icon = item.icon;
  const active = isNavActive(item.href, pathname, posMode);
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
  posMode,
  open,
  onToggle,
}: {
  item: NavItem;
  pathname: string;
  posMode?: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const Icon = item.icon;
  const childActive = childIsActive(item, pathname, posMode);

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
            const ChildIcon = child.icon || item.icon;
            if (child.children?.length) {
              const parentActive = isNavActive(child.href, pathname, posMode);
              return (
                <div key={child.labelKey} className="space-y-0.5">
                  {child.href ? (
                    <Link
                      href={child.href}
                      className={cn(
                        "flex min-h-8 items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[0.79rem] font-medium tracking-[-0.005em] transition-all duration-150",
                        parentActive
                          ? "border-white/10 bg-[#2563eb] text-white shadow-sm"
                          : "text-[#94a1b5] hover:border-white/5 hover:bg-white/[0.07] hover:text-[#e5eaf2]",
                      )}
                    >
                      {ChildIcon ? (
                        <ChildIcon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.7]", parentActive ? "text-white" : "text-[#738198]")} />
                      ) : null}
                      <span className="truncate">{navLabel(t, locale, child.labelKey)}</span>
                    </Link>
                  ) : (
                    <p className="px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wide text-[#738198]">
                      {navLabel(t, locale, child.labelKey)}
                    </p>
                  )}
                  <div className="ml-[0.85rem] space-y-0.5 border-l border-white/10 pl-2">
                    {child.children.map((nested) => {
                      if (!nested.href) return null;
                      const active = isNavActive(nested.href, pathname, posMode);
                      const NestedIcon = nested.icon || ChildIcon;
                      return (
                        <Link
                          key={nested.href}
                          href={nested.href}
                          className={cn(
                            "flex min-h-8 items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[0.79rem] font-medium tracking-[-0.005em] transition-all duration-150",
                            active
                              ? "border-white/10 bg-[#2563eb] text-white shadow-sm"
                              : "text-[#94a1b5] hover:border-white/5 hover:bg-white/[0.07] hover:text-[#e5eaf2]",
                          )}
                        >
                          {NestedIcon ? (
                            <NestedIcon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.7]", active ? "text-white" : "text-[#738198]")} />
                          ) : null}
                          <span className="truncate">{navLabel(t, locale, nested.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
            if (!child.href) return null;
            const active = isNavActive(child.href, pathname, posMode);
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
  const searchParams = useSearchParams();
  const posMode = searchParams.get("mode");
  const activeGroup =
    NAV_TREE.find((item) => item.children?.length && childIsActive(item, pathname, posMode))?.labelKey ?? null;
  const [openKey, setOpenKey] = useState<string | null>(activeGroup);

  useEffect(() => {
    setOpenKey(activeGroup);
  }, [pathname, posMode, activeGroup]);

  return (
    <nav className="erp-nav-scroll flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
      {NAV_TREE.map((item) => {
        if (!item.children?.length) {
          return <NavLeaf key={item.labelKey} item={item} pathname={pathname} posMode={posMode} />;
        }
        return (
          <NavGroup
            key={item.labelKey}
            item={item}
            pathname={pathname}
            posMode={posMode}
            open={openKey === item.labelKey}
            onToggle={() => setOpenKey((prev) => (prev === item.labelKey ? null : item.labelKey))}
          />
        );
      })}
    </nav>
  );
}
