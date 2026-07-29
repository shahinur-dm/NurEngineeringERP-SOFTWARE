"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
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
  onClick,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
  tone?: "default" | "warn" | "danger" | "info";
}) {
  const toneClass =
    tone === "warn"
      ? "gp-kpi-warn"
      : tone === "danger"
        ? "gp-kpi-danger"
        : tone === "info"
          ? "gp-kpi-info"
          : "border-line bg-white";

  return (
    <button
      type="button"
      data-animate="card"
      onClick={onClick}
      className={cn(
        "gp-card w-full p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        toneClass,
        onClick && "cursor-pointer",
      )}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="gp-money mt-1.5 text-xl tracking-tight text-[var(--gp-ink)] md:text-2xl">
        {typeof value === "number" ? formatBDT(value) : value}
      </p>
      {hint ? <p className="mt-1.5 text-sm font-semibold text-primary">{hint}</p> : null}
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-[#fafbfc] px-6 py-14 text-center text-[0.95rem] text-muted">
      {message}
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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  compact?: boolean;
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
          "max-h-[min(90vh,720px)] overflow-auto rounded-xl border border-line bg-white shadow-xl",
          wide ? "w-full max-w-5xl" : compact ? "w-full max-w-[420px]" : "w-full max-w-[480px]",
        )}
      >
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white",
            compact ? "px-4 py-2.5" : "px-4 py-3",
          )}
        >
          <h2 className="text-base font-bold text-[var(--gp-ink)]">{title}</h2>
          <button type="button" className="gp-btn gp-btn-ghost min-h-8 px-2.5" onClick={close}>
            ✕
          </button>
        </div>
        <div className={cn(compact ? "p-3.5" : "p-4")}>{children}</div>
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
