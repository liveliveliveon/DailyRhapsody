import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Set AUTH_SECRET (min 16 chars) in .env");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionCookie(): string {
  const payload = JSON.stringify({
    admin: true,
    exp: Date.now() + MAX_AGE * 1000,
  });
  const sig = sign(payload);
  const value = Buffer.from(payload).toString("base64url") + "." + sig;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const i = raw.lastIndexOf(".");
  if (i === -1) return false;
  const payloadB64 = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
  let payload: { admin?: boolean; exp?: number };
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return false;
  }
  if (!payload.admin || !payload.exp || payload.exp < Date.now()) return false;
  const expectedSig = sign(payloadStr);
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"));
  } catch {
    return false;
  }
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
