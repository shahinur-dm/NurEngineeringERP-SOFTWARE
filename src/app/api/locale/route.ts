import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { locales, defaultLocale, type Locale } from "@/i18n/request";

export async function POST(req: Request) {
  const body = await req.json();
  const locale = (locales.includes(body.locale) ? body.locale : defaultLocale) as Locale;
  const jar = await cookies();
  jar.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true, locale });
}
