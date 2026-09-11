import type { CookieOptions, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "lrs_session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS = "7d";

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
  companyName: string | null;
};

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: Role;
  display_name: string | null;
  status: string;
  company_name: string | null;
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

export function signSessionToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, jwtSecret(), {
    expiresIn: SEVEN_DAYS,
  });
}

export function toPublicUser(
  row: Pick<UserRow, "id" | "email" | "role"> &
    Partial<Pick<UserRow, "display_name" | "status" | "company_name">>,
): PublicUser {
  const status =
    row.status === "pending_verification" || row.status === "pending_approval"
      ? row.status
      : "active";

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name?.trim() || row.email,
    status,
    companyName: row.company_name ?? null,
  };
}

export function readSessionUserId(req: Request): number | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  try {
    const payload = jwt.verify(token, jwtSecret());
    if (typeof payload !== "object" || payload === null) {
      return null;
    }
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }
    return id;
  } catch {
    return null;
  }
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: sessionCookieOptions.httpOnly,
    secure: sessionCookieOptions.secure,
    sameSite: sessionCookieOptions.sameSite,
    path: sessionCookieOptions.path,
  });
}
