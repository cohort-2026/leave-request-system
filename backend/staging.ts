import type { Response } from "express";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
  type Role,
} from "./session.js";
import { clearChallengeCookie } from "./totp/challenge.js";

// Staging branch only. Keep this false on main.
export const STAGING_AUTH_BYPASS = true;

export const STAGING_ROLE_EMAIL: Record<Role, string> = {
  staff: "staff@leave.local",
  manager: "manager@leave.local",
  company_admin: "admin@leave.local",
  platform: "platform@leave.local",
};

export function isStagingAuthBypass(): boolean {
  return STAGING_AUTH_BYPASS && process.env.NODE_ENV !== "production";
}

export function issueStagingSession(res: Response, userId: number): void {
  clearChallengeCookie(res);
  const token = signSessionToken(userId);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
}
