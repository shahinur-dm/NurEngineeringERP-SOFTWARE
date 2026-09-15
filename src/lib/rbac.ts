import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { readSession } from "@/lib/auth";

/** Role hierarchy — higher index = more privileges */
const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  cashier: 1,
  accountant: 2,
  manager: 3,
  admin: 4,
};

export type Permission =
  | "read"
  | "write"
  | "delete"
  | "manage_users"
  | "manage_settings"
  | "seed"
  | "reports";

const PERMISSIONS: Record<string, Permission[]> = {
  viewer: ["read", "reports"],
  cashier: ["read", "write", "reports"],
  accountant: ["read", "write", "reports"],
  manager: ["read", "write", "delete", "reports", "manage_settings"],
  admin: ["read", "write", "delete", "manage_users", "manage_settings", "seed", "reports"],
};

export function roleRank(role: string) {
  return ROLE_RANK[role] ?? 0;
}

export function hasPermission(role: string, permission: Permission) {
  return (PERMISSIONS[role] || []).includes(permission);
}

export function canWrite(role: string) {
  return hasPermission(role, "write");
}

export function canDelete(role: string) {
  return hasPermission(role, "delete");
}

/** Highest existing role — used as Super Admin for sensitive product cost. */
export function isSuperAdmin(role: string) {
  return role === "admin";
}

export async function requireSession() {
  const session = await readSession();
  if (!session) {
    return { session: null as SessionUser | null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { session, error: null as NextResponse | null };
}

export async function requirePermission(permission: Permission) {
  const { session, error } = await requireSession();
  if (error || !session) return { session: null as SessionUser | null, error: error! };
  if (!hasPermission(session.role, permission)) {
    return {
      session: null as SessionUser | null,
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null as NextResponse | null };
}

export async function requireMinRole(minRole: keyof typeof ROLE_RANK) {
  const { session, error } = await requireSession();
  if (error || !session) return { session: null as SessionUser | null, error: error! };
  if (roleRank(session.role) < ROLE_RANK[minRole]) {
    return {
      session: null as SessionUser | null,
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null as NextResponse | null };
}
