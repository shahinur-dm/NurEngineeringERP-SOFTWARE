import { hashPassword } from "@/lib/auth";

const MAX_PHOTO = 1_200_000;

export function publicClient(doc: unknown) {
  if (!doc || typeof doc !== "object") return doc;
  const raw = "toObject" in doc && typeof (doc as { toObject: () => object }).toObject === "function"
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : { ...(doc as Record<string, unknown>) };
  const hasPassword = Boolean(raw.passwordHash);
  delete raw.passwordHash;
  delete raw.password;
  return { ...raw, hasPassword };
}

export async function prepareClientBody(body: Record<string, unknown>, { isUpdate }: { isUpdate: boolean }) {
  const next = { ...body };
  if (typeof next.name === "string") next.name = next.name.trim();
  if (!isUpdate && !next.name) {
    return { error: "Name is required.", field: "name" as const };
  }
  if (isUpdate && Object.prototype.hasOwnProperty.call(body, "name") && !next.name) {
    return { error: "Name is required.", field: "name" as const };
  }
  if (typeof next.email === "string" && next.email.trim()) {
    const email = next.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email.", field: "email" as const };
    }
    next.email = email;
  }
  if (typeof next.mobile === "string" && next.mobile.trim()) {
    next.mobile = next.mobile.trim().replace(/[^\d+]/g, "");
  }
  if (typeof next.website === "string" && next.website.trim()) {
    const website = next.website.trim();
    const site = website.startsWith("http") ? website : `https://${website}`;
    try {
      new URL(site);
    } catch {
      return { error: "Invalid website.", field: "website" as const };
    }
    next.website = website;
  }
  if (typeof next.photoUrl === "string") {
    const photoUrl = next.photoUrl;
    if (photoUrl.startsWith("data:image/") && photoUrl.length > MAX_PHOTO) {
      return { error: "Photo is too large.", field: "photoUrl" as const };
    }
  }
  const password = typeof next.password === "string" ? next.password : "";
  delete next.password;
  if (password) {
    if (password.length < 6) return { error: "Password must be at least 6 characters.", field: "password" as const };
    next.passwordHash = await hashPassword(password);
  } else if (isUpdate) {
    delete next.passwordHash;
  }
  delete next.hasPassword;
  return { body: next };
}
