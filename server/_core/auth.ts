import { COOKIE_NAME, SEVEN_DAYS_MS } from "@shared/const";
import { logger } from "./logger";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const PASSWORD_KEY_LENGTH = 64;

export type SessionPayload = {
  userId: number;
  username: string;
};

function getSessionSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  if (ENV.cookieSecret.length < 32) {
    throw new Error(
      `JWT_SECRET too short: ${ENV.cookieSecret.length} chars. Minimum 32 required.`
    );
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  if (!salt || !expectedHash) return false;
  const expected = Buffer.from(expectedHash, "hex");
  if (expected.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export async function createSessionToken(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? SEVEN_DAYS_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookieValue) {
    return null;
  }

  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { userId, username } = payload as Record<string, unknown>;

    if (typeof userId !== "number" || typeof username !== "string") {
      return null;
    }

    return {
      userId,
      username,
    };
  } catch (error) {
    logger.warn("auth.session_verification_failed", {
      message: String(error),
    });
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);

  if (!session) {
    throw new Error("Invalid session");
  }

  const user = await db.getUserById(session.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
