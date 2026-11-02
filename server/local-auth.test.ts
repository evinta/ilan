import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { User } from "../drizzle/schema";
import { assertLocalAuthConfiguration, clearLoginFailures, createLocalSessionToken, getLocalSessionUser, isLoginBlocked, LOCAL_ADMIN_OPEN_ID, LOCAL_SESSION_COOKIE, recordFailedLogin, verifyConfiguredAdminCredentials } from "./_core/local-auth";

const temporaryDirectories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Coolify local admin authentication", () => {
  it("generates and reuses a session key in the configured persistent data directory", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "vipilan-session-test-"));
    temporaryDirectories.push(directory);
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "a-long-test-password-123");
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("DATA_DIR", directory);

    await assertLocalAuthConfiguration();
    const first = (await readFile(path.join(directory, ".session-secret"), "utf8")).trim();
    await assertLocalAuthConfiguration();
    const second = (await readFile(path.join(directory, ".session-secret"), "utf8")).trim();

    expect(first.length).toBeGreaterThanOrEqual(64);
    expect(second).toBe(first);
  });

  it("accepts only the configured email/password pair and normalizes email case", () => {
    vi.stubEnv("ADMIN_EMAIL", "Owner@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "a-long-test-password-123");

    expect(verifyConfiguredAdminCredentials(" owner@EXAMPLE.com ", "a-long-test-password-123")).toBe(true);
    expect(verifyConfiguredAdminCredentials("other@example.com", "a-long-test-password-123")).toBe(false);
    expect(verifyConfiguredAdminCredentials("owner@example.com", "wrong-password")).toBe(false);
  });

  it("blocks the sixth login attempt after five failures and clears the counter after success", () => {
    const testIp = "unit-test-local-admin-ip";
    clearLoginFailures(testIp);
    expect(isLoginBlocked(testIp)).toBe(false);
    for (let index = 0; index < 5; index += 1) recordFailedLogin(testIp);
    expect(isLoginBlocked(testIp)).toBe(true);
    clearLoginFailures(testIp);
    expect(isLoginBlocked(testIp)).toBe(false);
  });

  it("issues an HttpOnly session for the configured admin and verifies it without a live database", async () => {
    vi.stubEnv("AUTH_PROVIDER", "local");
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "a-long-test-password-123");
    vi.stubEnv("COOKIE_SECURE", "true");
    const fakeAdmin = {
      id: 1,
      openId: LOCAL_ADMIN_OPEN_ID,
      name: "Yönetici",
      email: "owner@example.com",
      loginMethod: "password",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as User;
    vi.mocked(db.upsertUser).mockResolvedValue(undefined);
    vi.mocked(db.getUserByOpenId).mockResolvedValue(fakeAdmin);

    let issued: { name: string; value: string; options: Record<string, unknown> } | undefined;
    const req = { ip: "unit-test-success-ip", socket: { remoteAddress: "unit-test-success-ip" }, headers: { cookie: "" } };
    const res = { cookie: (name: string, value: string, options: Record<string, unknown>) => { issued = { name, value, options }; } };
    const caller = appRouter.createCaller({ req, res, user: null } as never);
    const result = await caller.auth.login({ email: " OWNER@example.com ", password: "a-long-test-password-123" });

    expect(result.success).toBe(true);
    expect(db.upsertUser).toHaveBeenCalledOnce();
    expect(issued?.name).toBe(LOCAL_SESSION_COOKIE);
    expect(issued?.options.httpOnly).toBe(true);
    expect(issued?.options.sameSite).toBe("lax");
    expect(issued?.options.secure).toBe(true);

    const authenticated = await getLocalSessionUser({ headers: { cookie: `${LOCAL_SESSION_COOKIE}=${issued?.value}` } } as never);
    expect(authenticated?.role).toBe("admin");

    vi.stubEnv("ADMIN_PASSWORD", "changed-test-password-456");
    const revoked = await getLocalSessionUser({ headers: { cookie: `${LOCAL_SESSION_COOKIE}=${issued?.value}` } } as never);
    expect(revoked).toBeNull();
  });

  it("creates a signed session token for the local admin", async () => {
    const token = await createLocalSessionToken();
    expect(token.split(".")).toHaveLength(3);
  });
});
