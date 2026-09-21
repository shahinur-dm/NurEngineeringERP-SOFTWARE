"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { EmptyState, Field, Modal, PageHeader } from "@/components/ui";
import { formatBDT, formatDateBD } from "@/lib/utils";

type Party = { _id: string; name: string };
type OpenDoc = { _id: string; reference?: string; party?: string; dueAmount: number; grandTotal: number };
type Row = {
  id: string;
  date: string;
  reference: string;
  party: string;
  description: string;
  paidReceived: number;
  cashImpact: number;
  bankImpact: number;
};

export function PartyPaymentPage({ kind }: { kind: "customer" | "supplier" }) {
  const t = useTranslations();
  const locale = useLocale();
  const isCustomer = kind === "customer";
  const title = isCustomer
    ? locale === "bn" ? "কাস্টমার পেমেন্ট" : "Customer Payment"
    : locale === "bn" ? "সাপ্লায়ার পেমেন্ট" : "Supplier Payment";

  const [rows, setRows] = useState<Row[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [openDocs, setOpenDocs] = useState<OpenDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [partyId, setPartyId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const partyType = isCustomer ? "customer" : "supplier";
      const txKind = isCustomer ? "customer_payment" : "supplier_payment";
      const [tx, p] = await Promise.all([
        fetch(`/api/accounts/transactions?kind=${txKind}`).then((r) => r.json()),
        fetch(`/api/contacts?type=${partyType}&limit=200`).then((r) => r.json()),
      ]);
      setRows(tx.data || []);
      setParties(p.data || []);
    } catch {
      setMsg(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [isCustomer, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadOpen = useCallback(async (cid: string) => {
    setDocumentId("");
    if (!cid) {
      setOpenDocs([]);
      return;
    }
    const res = await fetch(`/api/accounts/payments?kind=${kind}&contactId=${cid}`);
    const json = await res.json();
    setOpenDocs(json.data || []);
  }, [kind]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount || 0);
    if (value <= 0 || !partyId) {
      setMsg(locale === "bn" ? "পক্ষ ও পরিমাণ দিন" : "Select a party and amount");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/accounts/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          contactId: partyId,
          documentId: documentId || undefined,
          amount: value,
          method,
          note,
          paidAt,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(
          json.error === "exceeds_due"
            ? locale === "bn" ? "বাকির চেয়ে বেশি পরিমাণ" : "Amount exceeds outstanding due"
            : json.error === "no_due"
              ? locale === "bn" ? "কোনো বাকি নেই" : "No outstanding due"
              : t("common.error"),
        );
        return;
      }
      setOpen(false);
      setAmount("");
      setPartyId("");
      setDocumentId("");
      setNote("");
      setOpenDocs([]);
      await load();
      setMsg(locale === "bn" ? "পেমেন্ট সংরক্ষিত" : "Payment saved");
    } catch {
      setMsg(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          locale === "bn"
            ? "বাকি কমায় এবং নগদ/ব্যাংক আপডেট করে — ডুপ্লিকেট জার্নাল নয়"
            : "Reduces due on the source invoice or purchase — no duplicate journal"
        }
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
                <th>{locale === "bn" ? "তারিখ" : "Date"}</th>
                <th>{locale === "bn" ? "রেফারেন্স" : "Reference"}</th>
                <th>{isCustomer ? (locale === "bn" ? "গ্রাহক" : "Customer") : (locale === "bn" ? "সরবরাহকারী" : "Supplier")}</th>
                <th>{locale === "bn" ? "বিবরণ" : "Description"}</th>
                <th className="text-right">{locale === "bn" ? "পরিমাণ" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateBD(r.date, locale)}</td>
                  <td className="font-semibold">{r.reference || "—"}</td>
                  <td>{r.party}</td>
                  <td>{r.description}</td>
                  <td className="gp-money text-right">{formatBDT(r.paidReceived, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={title} onClose={() => setOpen(false)} wide>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={locale === "bn" ? "তারিখ" : "Date"}>
              <input type="date" className="gp-input" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </Field>
            <Field label={isCustomer ? (locale === "bn" ? "গ্রাহক" : "Customer") : (locale === "bn" ? "সরবরাহকারী" : "Supplier")}>
              <select
                className="gp-input"
                value={partyId}
                onChange={(e) => {
                  setPartyId(e.target.value);
                  void loadOpen(e.target.value);
                }}
              >
                <option value="">—</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label={locale === "bn" ? "ইনভয়েস/ক্রয় (ঐচ্ছিক)" : "Invoice / purchase (optional)"}>
              <select className="gp-input" value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
                <option value="">{locale === "bn" ? "সবচেয়ে পুরনো বাকি আগে" : "Oldest due first"}</option>
                {openDocs.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.reference} — due {d.dueAmount}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={locale === "bn" ? "পরিমাণ" : "Amount"}>
              <input type="number" min={0} step="0.01" className="gp-input" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={locale === "bn" ? "মাধ্যম" : "Cash / Bank"}>
              <select className="gp-input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
            <Field label={locale === "bn" ? "নোট" : "Note"}>
              <input className="gp-input" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
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
