"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { CrudForm } from "@/components/CrudForm";
import { InvoiceActions } from "@/components/InvoiceActions";
import { EmptyState, Field, FilterBar, Modal, PageHeader } from "@/components/ui";
import { formatBDT, formatDateBD } from "@/lib/utils";
import { getModule, type ModuleDef } from "@/lib/module-registry";
import { getCrudConfig, isReadOnlyModule, type CrudConfig } from "@/lib/crud-config";
import { animateIn, animateStagger } from "@/lib/gsap";

function cellValue(
  row: Record<string, unknown>,
  key: string,
  format: ModuleDef["columns"][0]["format"],
  locale: string,
) {
  const v = row[key];
  if (v == null) return "";
  if (format === "money") return formatBDT(Number(v), locale);
  if (format === "date") return formatDateBD(String(v), locale);
  if (Array.isArray(v)) {
    return v
      .map((item) => (item == null ? "" : String(item)))
      .filter(Boolean)
      .join(" : ");
  }
  if (typeof v === "object") {
    // Avoid dumping raw JSON objects in the table
    return Object.values(v as Record<string, unknown>)
      .map((item) => (item == null ? "" : String(item)))
      .filter(Boolean)
      .join(" : ");
  }
  // If value was stored as a JSON array string, unwrap it
  if (typeof v === "string" && v.trim().startsWith("[") && v.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean).join(" : ");
      }
    } catch {
      // keep as plain string
    }
  }
  return String(v);
}

function postUrl(config: CrudConfig) {
  return config.itemPath;
}

function itemUrl(config: CrudConfig, id: string) {
  return `${config.itemPath}/${id}`;
}

export function ModulePage({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);
  const crud = getCrudConfig(moduleId);
  const t = useTranslations();
  const locale = useLocale();
  const pageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const listApi = mod?.apiPath || crud?.listPath || "";

  const load = useCallback(async () => {
    if (!listApi) return;
    setLoading(true);
    const qs = new URLSearchParams({ limit: "100" });
    if (q) qs.set("q", q);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const sep = listApi.includes("?") ? "&" : "?";
    try {
      const res = await fetch(`${listApi}${sep}${qs}`);
      const d = await res.json();
      setRows(d.data || d.rows || d.summary || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [listApi, q, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    animateIn(pageRef.current, { y: 18 });
  }, []);

  useEffect(() => {
    if (!loading && tableRef.current) {
      animateStagger(tableRef.current.querySelectorAll("tr"));
    }
  }, [loading, rows]);

  async function saveRecord(data: Record<string, unknown>) {
    if (!crud) return;
    setSaving(true);
    try {
      if (editing?._id) {
        await fetch(itemUrl(crud, String(editing._id)), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch(postUrl(crud), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(row: Record<string, unknown>) {
    if (!crud || !row._id) return;
    const msg = locale === "bn" ? "এই রেকর্ড মুছে ফেলবেন?" : "Delete this record?";
    if (!confirm(msg)) return;
    await fetch(itemUrl(crud, String(row._id)), { method: "DELETE" });
    await load();
  }

  if (!mod) {
    return <EmptyState message={t("common.noData")} />;
  }

  const title = locale === "bn" ? mod.titleBn : mod.titleEn;
  const readOnly = isReadOnlyModule(moduleId);
  const showCrud = crud && !readOnly;
  const hasInvoiceCol = mod.columns.some((c) => c.key === "invoiceNo");
  const showActions = showCrud || hasInvoiceCol;

  return (
    <div ref={pageRef}>
      <PageHeader
        title={title}
        subtitle={t("reports.drillHint")}
        actions={
          <>
            {showCrud && crud.canCreate ? (
              <button
                type="button"
                className="gp-btn gp-btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-5 w-5" />
                {t("common.add")}
              </button>
            ) : null}
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => window.print()}>
              <Download className="h-5 w-5" />
              {t("common.exportPdf")}
            </button>
          </>
        }
      />

      <FilterBar>
        <Field label={t("common.search")}>
          <input className="gp-input" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label={t("dashboard.fromDate")}>
          <input type="date" className="gp-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("dashboard.toDate")}>
          <input type="date" className="gp-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <button type="button" className="gp-btn gp-btn-primary w-full" onClick={load}>
            {t("dashboard.apply")}
          </button>
        </div>
      </FilterBar>

      <div className="gp-table-wrap overflow-auto">
        {loading ? (
          <p className="p-8 text-center text-muted">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <table className="gp-table">
            <thead>
              <tr>
                {mod.columns.map((c) => (
                  <th key={c.key}>{locale === "bn" ? c.labelBn : c.labelEn}</th>
                ))}
                {showActions ? <th>{t("common.actions")}</th> : null}
              </tr>
            </thead>
            <tbody ref={tableRef}>
              {rows.map((row, i) => {
                const rowId = String(row._id || row.id || "");
                const showInvoice = hasInvoiceCol && !!rowId && !!row.invoiceNo;
                return (
                <tr key={rowId || String(i)}>
                  {mod.columns.map((c) => (
                    <td key={c.key} className={c.format === "money" ? "font-semibold" : ""}>
                      {c.key === "invoiceNo" && showInvoice ? (
                        <a
                          href={`/sales/${rowId}/invoice`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {cellValue(row, c.key, c.format, locale)}
                        </a>
                      ) : (
                        cellValue(row, c.key, c.format, locale)
                      )}
                    </td>
                  ))}
                  {showActions ? (
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {showInvoice ? <InvoiceActions saleId={rowId} compact /> : null}
                        {showCrud && crud.canUpdate ? (
                          <button
                            type="button"
                            className="gp-btn gp-btn-ghost min-h-9 px-2"
                            onClick={() => {
                              setEditing(row);
                              setFormOpen(true);
                            }}
                            title={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {showCrud && crud.canDelete ? (
                          <button
                            type="button"
                            className="gp-btn gp-btn-danger min-h-9 px-2"
                            onClick={() => deleteRecord(row)}
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={formOpen && !!crud}
        title={editing ? t("common.edit") : t("common.add")}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        {crud ? (
          <CrudForm
            config={crud}
            initial={editing || undefined}
            isEdit={!!editing}
            saving={saving}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSubmit={saveRecord}
          />
        ) : null}
      </Modal>
    </div>
  );
}
