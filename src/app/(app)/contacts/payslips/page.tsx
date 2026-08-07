"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Employee = { _id: string; name: string; nameBn?: string; basicSalary?: number };
type Slip = {
  _id: string;
  slipNo: string;
  employeeName?: string;
  periodLabel?: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: string;
  createdAt?: string;
};

export default function PayslipsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [rows, setRows] = useState<Slip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    employeeId: "",
    periodLabel: "",
    basicSalary: "",
    allowances: "0",
    deductions: "0",
    note: "",
    paid: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        fetch("/api/payslips?limit=100").then((r) => r.json()),
        fetch("/api/contacts?type=employee&limit=200").then((r) => r.json()),
      ]);
      setRows(p.data || []);
      setEmployees(e.data || []);
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function onPickEmployee(id: string) {
    const emp = employees.find((x) => x._id === id);
    setForm((f) => ({
      ...f,
      employeeId: id,
      basicSalary: String(emp?.basicSalary ?? f.basicSalary ?? "0"),
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          periodLabel: form.periodLabel,
          basicSalary: Number(form.basicSalary || 0),
          allowances: Number(form.allowances || 0),
          deductions: Number(form.deductions || 0),
          note: form.note,
          paid: form.paid,
          updateEmployeeSalary: 1,
        }),
      });
      if (!res.ok) throw new Error("fail");
      setOpen(false);
      await load();
      setMsg(locale === "bn" ? "পেস্লিপ তৈরি হয়েছে" : "Payslip created");
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={locale === "bn" ? "কর্মচারী পেস্লিপ" : "Employee payslips"}
        subtitle={locale === "bn" ? "বেসিক স্যালারিসহ" : "Includes basic salary"}
        actions={
          <button type="button" className="gp-btn gp-btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("common.add")}
          </button>
        }
      />
      {msg ? (
        <p className="mb-4 rounded-xl border border-line bg-[var(--gp-primary-soft)] px-3 py-2 text-sm font-semibold text-primary">
          {msg}
        </p>
      ) : null}
      {loading ? (
        <EmptyState message={t("app.loading")} />
      ) : rows.length === 0 ? (
        <EmptyState message={t("common.noData")} />
      ) : (
        <div className="gp-table-wrap">
          <table className="gp-table">
            <thead>
              <tr>
                <th>{locale === "bn" ? "নং" : "No"}</th>
                <th>{locale === "bn" ? "কর্মচারী" : "Employee"}</th>
                <th>{locale === "bn" ? "পিরিয়ড" : "Period"}</th>
                <th>{locale === "bn" ? "বেসিক স্যালারি" : "Basic salary"}</th>
                <th>{locale === "bn" ? "নেট" : "Net"}</th>
                <th>{locale === "bn" ? "স্ট্যাটাস" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="font-semibold">{r.slipNo}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.periodLabel || (r.createdAt ? formatDateBD(r.createdAt, locale) : "—")}</td>
                  <td className="gp-money">{formatBDT(r.basicSalary, locale)}</td>
                  <td className="gp-money font-semibold">{formatBDT(r.netPay, locale)}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={locale === "bn" ? "নতুন পেস্লিপ" : "New payslip"} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Field label={locale === "bn" ? "কর্মচারী" : "Employee"}>
            <select
              className="gp-input"
              required
              value={form.employeeId}
              onChange={(e) => onPickEmployee(e.target.value)}
            >
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {locale === "bn" && e.nameBn ? e.nameBn : e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={locale === "bn" ? "পিরিয়ড" : "Period"}>
            <input
              className="gp-input"
              placeholder={locale === "bn" ? "যেমন: আগস্ট ২০২৬" : "e.g. Aug 2026"}
              value={form.periodLabel}
              onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "বেসিক স্যালারি" : "Basic salary"}>
            <input
              type="number"
              min={0}
              className="gp-input"
              required
              value={form.basicSalary}
              onChange={(e) => setForm((f) => ({ ...f, basicSalary: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "অ্যালাউন্স" : "Allowances"}>
            <input
              type="number"
              min={0}
              className="gp-input"
              value={form.allowances}
              onChange={(e) => setForm((f) => ({ ...f, allowances: e.target.value }))}
            />
          </Field>
          <Field label={locale === "bn" ? "কর্তন" : "Deductions"}>
            <input
              type="number"
              min={0}
              className="gp-input"
              value={form.deductions}
              onChange={(e) => setForm((f) => ({ ...f, deductions: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.paid}
              onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))}
            />
            {locale === "bn" ? "পেইড হিসেবে চিহ্নিত" : "Mark as paid"}
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="gp-btn gp-btn-ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="gp-btn gp-btn-primary" disabled={busy}>
              {t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
