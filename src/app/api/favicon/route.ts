import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Business } from "@/models";

export const dynamic = "force-dynamic";

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#163f86" stroke="#e8892c" stroke-width="4"/><text x="32" y="38" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">NES</text></svg>`;

export async function GET() {
  try {
    await connectDB();
    const business = await Business.findOne().select("faviconUrl").lean();
    const raw = String((business as { faviconUrl?: string } | null)?.faviconUrl || "").trim();
    if (raw) {
      const dataMatch = raw.match(/^data:([^;,]+);base64,(.+)$/);
      if (dataMatch) {
        const mime = dataMatch[1] || "image/png";
        const buf = Buffer.from(dataMatch[2], "base64");
        return new NextResponse(buf, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=0, must-revalidate",
          },
        });
      }
      if (/^https?:\/\//i.test(raw)) {
        return NextResponse.redirect(raw);
      }
    }
    return new NextResponse(DEFAULT_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new NextResponse(DEFAULT_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }
}
