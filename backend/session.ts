import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "lrs_session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS = "7d";
const SESSION_TOKEN_TTL = "12h";

export type Role = "staff" | "manager" | "company_admin" | "platform";

export type AccountStatus =
  | "pending_verification"
  | "pending_approval"
  | "active";

export type PublicUser = {
  id: number;
  email: string;
  role: Role;
  displayName: string;
  status: AccountStatus;
  companyName: null;
};

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is missing. Copy backend/.env.example to backend/.env and fill it in.",
    );
  }
  return secret;
}

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  path: "/",
  maxAge: SEVEN_DAYS_MS,
};

export function signSessionToken(userId: number, rememberMe: boolean): string {
  return jwt.sign({ sub: String(userId) }, jwtSecret(), {
    expiresIn: rememberMe ? SEVEN_DAYS : SESSION_TOKEN_TTL,
  });
}

export function getSessionCookieOptions(rememberMe: boolean): CookieOptions {
  if (rememberMe) {
    return sessionCookieOptions;
  }

  const { maxAge: _maxAge, ...sessionCookie } = sessionCookieOptions;
  return sessionCookie;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.email,
    status: "active",
    companyName: null,
  };
}
