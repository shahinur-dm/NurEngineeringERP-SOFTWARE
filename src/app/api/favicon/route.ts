import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Business } from "@/models";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const business = await Business.findOne().select("faviconUrl").lean();
    const raw = String((business as { faviconUrl?: string } | null)?.faviconUrl || "");
    if (!raw) {
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    const dataMatch = raw.match(/^data:([^;,]+);base64,(.+)$/);
    if (dataMatch) {
      const buf = Buffer.from(dataMatch[2], "base64");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": dataMatch[1] || "image/png",
          "Cache-Control": "no-store",
        },
      });
    }
    if (/^https?:\/\//i.test(raw)) {
      return NextResponse.redirect(raw);
    }
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
}
