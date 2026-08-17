import { hashPassword, verifyPassword } from "@/lib/auth";
import { DEMO_ADMIN, DEMO_ADMIN_ALIASES } from "@/lib/seed-data";
import { User } from "@/models";

export { DEMO_ADMIN, DEMO_ADMIN_ALIASES };

const DEMO_EMAILS = DEMO_ADMIN_ALIASES.filter((value) => value.includes("@"));

export function normalizeLoginId(value: string) {
  return String(value || "").trim().toLowerCase();
}

export function isDemoAdminIdentity(email: string) {
  return DEMO_ADMIN_ALIASES.includes(normalizeLoginId(email));
}

export async function findDemoAdmin() {
  return User.findOne({ email: { $in: DEMO_EMAILS } });
}

export async function ensureDemoAdminUser(locationId?: unknown) {
  const passwordHash = await hashPassword(DEMO_ADMIN.password);
  let admin = await findDemoAdmin();
  if (!admin) {
    admin = await User.create({
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      passwordHash,
      role: "admin",
      phone: DEMO_ADMIN.phone,
      locale: "bn",
      isActive: true,
      ...(locationId ? { locationIds: [locationId] } : {}),
    });
    return admin;
  }

  admin.email = DEMO_ADMIN.email;
  admin.passwordHash = passwordHash;
  admin.isActive = true;
  admin.name = DEMO_ADMIN.name;
  admin.role = "admin";
  if (locationId) admin.locationIds = [locationId as never];
  await admin.save();
  return admin;
}

/** Demo email + demo password always unlocks, even if the stored hash is stale. */
export async function resolveLoginUser(email: string, password: string) {
  const loginId = normalizeLoginId(email);
  let user = await User.findOne({ email: loginId });

  if (!user && isDemoAdminIdentity(loginId)) {
    user = await findDemoAdmin();
  }

  if (isDemoAdminIdentity(loginId) && password === DEMO_ADMIN.password) {
    if (!user) {
      return ensureDemoAdminUser();
    }

    let matches = false;
    try {
      matches = Boolean(user.passwordHash) && (await verifyPassword(password, user.passwordHash));
    } catch {
      matches = false;
    }

    if (!matches || !user.isActive || user.email !== DEMO_ADMIN.email) {
      user.passwordHash = await hashPassword(DEMO_ADMIN.password);
      user.email = DEMO_ADMIN.email;
      user.isActive = true;
      if (user.role !== "admin") user.role = "admin";
      await user.save();
    }
    return user;
  }

  if (!user?.passwordHash) return null;
  try {
    return (await verifyPassword(password, user.passwordHash)) ? user : null;
  } catch {
    return null;
  }
}
