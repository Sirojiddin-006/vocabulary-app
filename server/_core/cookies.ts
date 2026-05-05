import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  _req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    path: "/",
    sameSite: isProduction ? "strict" : "lax",
    secure: isProduction,
  };
}
