import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { loadAccountsBooks } from "@/lib/accounts-books";

export async function GET() {
  const { session, error } = await requireSession();
  if (error || !session) return error!;
  await connectDB();
  const { summary } = await loadAccountsBooks();
  return NextResponse.json({ data: summary });
}
