import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  ensureSaleNumberIndexes,
  nextQuotationNo,
  nextReferenceNo,
} from "@/lib/doc-numbers";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  await ensureSaleNumberIndexes();

  const kind = new URL(req.url).searchParams.get("kind");
  if (kind === "quotation") {
    return NextResponse.json({ value: await nextQuotationNo() });
  }
  if (kind === "reference") {
    return NextResponse.json({ value: await nextReferenceNo() });
  }

  return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
}
