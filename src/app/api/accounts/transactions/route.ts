import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { loadAccountsBooks, type AccountsTxType } from "@/lib/accounts-books";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error!;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") || "documents";
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const { transactions } = await loadAccountsBooks();

  const documentTypes: AccountsTxType[] = ["sale", "purchase", "expense"];
  const paymentTypes: AccountsTxType[] = ["customer_payment", "supplier_payment"];
  let rows = transactions;
  if (kind === "documents") rows = rows.filter((r) => documentTypes.includes(r.type));
  if (kind === "customer_payment") rows = rows.filter((r) => r.type === "customer_payment");
  if (kind === "supplier_payment") rows = rows.filter((r) => r.type === "supplier_payment");
  if (kind === "payments") rows = rows.filter((r) => paymentTypes.includes(r.type));
  if (q) {
    rows = rows.filter(
      (r) =>
        r.reference.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.type.includes(q),
    );
  }
  return NextResponse.json({ data: rows, total: rows.length });
}
