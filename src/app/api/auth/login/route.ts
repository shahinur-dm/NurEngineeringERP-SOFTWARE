import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  createSessionToken,
  applySessionCookie,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";
import { User } from "@/models";

const DEMO_PASSWORD = "admin123";
const DEMO_ADMIN_EMAIL = "admin@ditpharma.bd";
const DEMO_ADMIN_ALIASES = [DEMO_ADMIN_EMAIL, "admin@greenpharma.bd"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "missing" }, { status: 400 });
    }

    await connectDB();
    let user = await User.findOne({ email });

    // Legacy rename: DB may still have admin@greenpharma.bd while UI uses ditpharma.
    if (!user && DEMO_ADMIN_ALIASES.includes(email)) {
      user = await User.findOne({ email: { $in: DEMO_ADMIN_ALIASES } });
    }

    if (!user) {
      const count = await User.countDocuments();
      if (count === 0 && DEMO_ADMIN_ALIASES.includes(email)) {
        user = await User.create({
          name: "Admin",
          email: DEMO_ADMIN_EMAIL,
          passwordHash: await hashPassword(DEMO_PASSWORD),
          role: "admin",
          locale: "bn",
        });
      }
    }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "inactive" }, { status: 403 });
    }

    // Keep demo admin on the canonical email after a successful login.
    if (
      DEMO_ADMIN_ALIASES.includes(user.email) &&
      user.email !== DEMO_ADMIN_EMAIL
    ) {
      user.email = DEMO_ADMIN_EMAIL;
      await user.save();
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
