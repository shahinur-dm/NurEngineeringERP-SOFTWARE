import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createSessionToken, applySessionCookie } from "@/lib/auth";
import { resolveLoginUser } from "@/lib/demo-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "missing" }, { status: 400 });
    }

    await connectDB();
    const user = await resolveLoginUser(email, password);

    if (!user) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "inactive" }, { status: 403 });
    }

    const token = await createSessionToken({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      locale: user.locale === "en" ? "en" : "bn",
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        locale: user.locale,
      },
    });
    return applySessionCookie(res, token);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/ENOTFOUND|querySrv|ECONNREFUSED|MongoServerSelection|authentication failed|bad auth/i.test(msg)) {
      return NextResponse.json({ error: "db" }, { status: 503 });
    }
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
