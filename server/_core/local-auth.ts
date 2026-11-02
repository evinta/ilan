import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export const LOCAL_ADMIN_OPEN_ID = "local-admin";
export const LOCAL_SESSION_COOKIE = "vip_ilani_session";
const SESSION_ISSUER = "vip-ilan";
const SESSION_AUDIENCE = "vip-ilan-admin";
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map<string, { count: number; resetAt: number; blockedUntil?: number }>();
let cachedSessionKey: Uint8Array | undefined;

function sessionVersion(secretKey: Uint8Array): string {
  return createHmac("sha256", secretKey).update(ENV.adminPassword).digest("base64url");
}

async function getSessionKey(): Promise<Uint8Array> {
  if (cachedSessionKey) return cachedSessionKey;
  if (ENV.sessionSecret) {
    if (ENV.sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    cachedSessionKey = new TextEncoder().encode(ENV.sessionSecret);
    return cachedSessionKey;
  }

  await mkdir(ENV.dataDir, { recursive: true, mode: 0o750 });
  const secretPath = path.join(ENV.dataDir, ".session-secret");
  try {
    const existing = (await readFile(secretPath, "utf8")).trim();
    if (existing.length < 64) throw new Error("Stored session secret is invalid");
    cachedSessionKey = new TextEncoder().encode(existing);
    return cachedSessionKey;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const created = randomBytes(48).toString("base64url");
  try {
    await writeFile(secretPath, `${created}\n`, { flag: "wx", mode: 0o600 });
    cachedSessionKey = new TextEncoder().encode(created);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = (await readFile(secretPath, "utf8")).trim();
    cachedSessionKey = new TextEncoder().encode(existing);
  }
  return cachedSessionKey;
}

export async function assertLocalAuthConfiguration(): Promise<void> {
  if (!ENV.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ENV.adminEmail)) {
    throw new Error("Set a valid ADMIN_EMAIL when AUTH_PROVIDER=local");
  }
  if (ENV.adminPassword.length < 12) {
    throw new Error("Set an ADMIN_PASSWORD with at least 12 characters when AUTH_PROVIDER=local");
  }
  await getSessionKey();
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function verifyConfiguredAdminCredentials(email: string, password: string): boolean {
  const suppliedEmail = email.trim().toLowerCase();
  const emailMatches = constantTimeEqual(suppliedEmail, ENV.adminEmail);
  const passwordMatches = constantTimeEqual(password, ENV.adminPassword);
  return Boolean(ENV.adminEmail && ENV.adminPassword) && emailMatches && passwordMatches;
}

export function isLoginBlocked(ip: string): boolean {
  const key = ip || "unknown";
  const record = loginFailures.get(key);
  if (!record) return false;
  const now = Date.now();
  if (record.blockedUntil && now < record.blockedUntil) return true;
  if (now >= record.resetAt) {
    loginFailures.delete(key);
    return false;
  }
  return false;
}

export function recordFailedLogin(ip: string): void {
  const key = ip || "unknown";
  const now = Date.now();
  const current = loginFailures.get(key);
  const record = !current || now >= current.resetAt
    ? { count: 0, resetAt: now + LOGIN_WINDOW_MS }
    : current;
  record.count += 1;
  if (record.count >= MAX_LOGIN_FAILURES) record.blockedUntil = now + LOGIN_WINDOW_MS;
  loginFailures.set(key, record);
}

export function clearLoginFailures(ip: string): void {
  loginFailures.delete(ip || "unknown");
}

export async function createLocalSessionToken(): Promise<string> {
  const key = await getSessionKey();
  return new SignJWT({ sessionVersion: sessionVersion(key) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(LOCAL_ADMIN_OPEN_ID)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
}

export async function getLocalSessionUser(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[LOCAL_SESSION_COOKIE];
  if (!token || !ENV.adminEmail || !ENV.adminPassword) return null;
  try {
    const secretKey = await getSessionKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (payload.sub !== LOCAL_ADMIN_OPEN_ID || payload.sessionVersion !== sessionVersion(secretKey)) return null;
    const user = await db.getUserByOpenId(LOCAL_ADMIN_OPEN_ID);
    if (!user || user.role !== "admin" || user.email?.toLowerCase() !== ENV.adminEmail) return null;
    return user;
  } catch {
    return null;
  }
}
