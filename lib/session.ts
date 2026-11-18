import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./data";
import type { Actor, Role, User } from "./types";

const COOKIE = "ek_session";
const SECRET = process.env.SESSION_SECRET ?? "demo-secret-degistir";
const MAX_AGE = 60 * 60 * 24 * 7;

function sign(v: string) {
  return createHmac("sha256", SECRET).update(v).digest("base64url");
}

export async function createSession(userId: string) {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [userId, exp] = payload.split(".");
  if (!exp || Number(exp) < Date.now()) return null;
  const u = (await getDb()).users.find((x) => x.id === userId);
  return u && u.active ? u : null;
}

export async function currentActor(): Promise<Actor | null> {
  const u = await currentUser();
  return u ? { id: u.id, role: u.role } : null;
}

const LOGIN: Record<Role, string> = { SELLER: "/giris", ADMIN: "/giris?rol=admin", CUSTOMER: "/musteri/giris" };

/** Sayfa/layout koruması: yanlış rol → ilgili giriş sayfasına yönlendirir. */
export async function requireRole(role: Role, returnTo?: string): Promise<User> {
  const u = await currentUser();
  if (!u || u.role !== role) {
    const base = LOGIN[role];
    redirect(returnTo ? `${base}${base.includes("?") ? "&" : "?"}donus=${encodeURIComponent(returnTo)}` : base);
  }
  return u as User;
}

export function homeFor(role: Role) {
  return role === "SELLER" ? "/panel" : role === "ADMIN" ? "/admin" : "/musteri";
}
