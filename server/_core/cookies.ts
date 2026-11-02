import type { CookieOptions, Request } from "express";

type AuthProvider = "manus" | "local";

export function getSessionCookieOptions(_req: Request, provider: AuthProvider = "manus"): CookieOptions {
  if (provider === "local") {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE !== "false",
    };
  }

  // Manus Preview is public HTTPS in a cross-site frame even when the upstream request is HTTP.
  return { httpOnly: true, path: "/", sameSite: "none", secure: true };
}
