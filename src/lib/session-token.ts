import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "cellix_admin";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Key derived from the password, so rotating ADMIN_PASSWORD signs everyone out. */
function signingKey(): Buffer | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const pepper = process.env.ADMIN_SESSION_SECRET ?? "";
  return createHash("sha256").update(`cellix-admin:${password}:${pepper}`).digest();
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordMatches(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(password));
}

export function createSessionToken(nowMs = Date.now()): string | null {
  const key = signingKey();
  if (!key) return null;
  const expires = String(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  return `${expires}.${sign(expires, key)}`;
}

export function verifySessionToken(token: string | undefined, nowMs = Date.now()): boolean {
  const key = signingKey();
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  if (Number(expires) * 1000 <= nowMs) return false;
  return safeEqual(signature, sign(expires, key));
}
