"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn, formatBDT } from "@/lib/utils";
import { animateModalIn, animateModalOut, animateCardsIn } from "@/lib/gsap";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="gp-display text-2xl font-bold tracking-tight text-[var(--gp-ink)] md:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-[0.95rem] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: any;
  onClick?: () => void;
  tone?: "default" | "warn" | "danger" | "info";
}) {
  const t = useTranslations();
  const iconWrap =
    tone === "warn"
      ? "bg-[#f97316] text-white"
      : tone === "danger"
        ? "bg-[#ef4444] text-white"
        : tone === "info"
          ? "bg-[#22c55e] text-white"
          : "bg-[#2563eb] text-white";
  return (
    <button
      type="button"
      data-animate="card"
      onClick={onClick}
      className={cn(
        "gp-card gp-kpi-card flex min-h-[148px] w-full flex-col p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-bold uppercase leading-snug tracking-[0.08em] text-muted">
          {label}
        </p>
        {Icon ? (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm", iconWrap)}>
            <Icon className="h-5 w-5" />
          </span>
        ) : (
          <span className="h-11 w-11 shrink-0" aria-hidden />
        )}
      </div>
      <div className="mt-3">
        <p className="gp-money text-[1.7rem] leading-none tracking-tight text-[var(--gp-ink)] md:text-[1.85rem]">
          {typeof value === "number" ? formatBDT(value) : value}
        </p>
        <p className="mt-2 min-h-[1rem] text-xs font-medium text-muted">
          {hint || "\u00A0"}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-[#eef2f7] pt-3">
        <span className="text-sm font-medium text-muted">{t("common.view")}</span>
        <span className="text-xs font-semibold text-emerald-600">→</span>
      </div>
    </button>
  );
}

export function EmptyState({
  message,
  title,
  description,
  action,
}: {
  message?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9e3ef] bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold text-slate-800">{title || message}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AlertBanner({
  tone,
  message,
  onClose,
}: {
  tone: "success" | "error" | "info";
  message: string;
  onClose?: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "border-[var(--gp-success-border,#bbf7d0)] bg-[var(--gp-success-bg,#f0fdf4)] text-[var(--gp-success,#15803d)]"
      : tone === "error"
        ? "border-[var(--gp-danger-border,#fecaca)] bg-[var(--gp-danger-bg,#fef2f2)] text-[var(--gp-danger,#b91c1c)]"
        : "border-line bg-[var(--gp-bg)] text-[var(--gp-ink)]";

  return (
    <div
      className={cn(
        "mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
        toneClass,
      )}
      role="status"
    >
      <span>{message}</span>
      {onClose ? (
        <button
          type="button"
          className="shrink-0 opacity-70 hover:opacity-100"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="gp-table-wrap overflow-x-auto">
      <table className="gp-table w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="gp-skeleton h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div className="gp-skeleton h-4 w-full max-w-[140px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="gp-card mb-5 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-[0.8rem] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
  compact,
  fit,
  scrollBody,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  compact?: boolean;
  fit?: boolean;
  scrollBody?: boolean;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (open && !visible.current) {
      visible.current = true;
      requestAnimationFrame(() => animateModalIn(backdropRef.current, panelRef.current));
    }
    if (!open) visible.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    animateModalOut(backdropRef.current, panelRef.current, onClose);
  }

  if (!open || !ready) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(21,32,51,0.4)] p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className={cn(
          "rounded-xl border border-line bg-white shadow-xl",
          wide
            ? scrollBody
              ? "w-full max-w-6xl"
              : "w-full max-w-5xl"
            : compact
              ? "w-full max-w-[420px]"
              : fit
                ? "w-full max-w-[560px]"
                : "w-full max-w-[480px]",
          scrollBody
            ? "flex max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden"
            : fit
              ? "overflow-visible"
              : "max-h-[min(90vh,720px)] overflow-auto",
        )}
      >
        <div
          className={cn(
            "sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-line bg-white",
            compact ? "px-4 py-2.5" : "px-4 py-3",
          )}
        >
          <h2 className="text-base font-bold text-[var(--gp-ink)]">{title}</h2>
          <button type="button" className="gp-btn gp-btn-ghost min-h-8 px-2.5" onClick={close}>
            ✕
          </button>
        </div>
        <div
          className={cn(
            scrollBody && "min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
            compact ? "p-3.5" : "p-4",
            scrollBody && compact && "p-2.5",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PageAnimator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    animateCardsIn(ref.current);
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
