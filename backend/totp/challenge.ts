import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { pool } from "../db.js";

export const CHALLENGE_COOKIE = "lrs_mfa";
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const MAX_CHALLENGE_ATTEMPTS = 5;

export type ChallengePurpose = "enroll" | "login";

export type ChallengeRow = {
  id: number;
  user_id: number;
  purpose: ChallengePurpose;
  pending_secret_cipher: string | null;
  failed_attempts: number;
};

const challengeCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: CHALLENGE_TTL_MS,
};

function hashChallengeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function setChallengeCookie(res: Response, token: string): void {
  res.cookie(CHALLENGE_COOKIE, token, challengeCookieOptions);
}

export function clearChallengeCookie(res: Response): void {
  res.clearCookie(CHALLENGE_COOKIE, {
    httpOnly: challengeCookieOptions.httpOnly,
    secure: challengeCookieOptions.secure,
    sameSite: challengeCookieOptions.sameSite,
    path: challengeCookieOptions.path,
  });
}

export async function issueChallenge(
  userId: number,
  purpose: ChallengePurpose,
  pendingSecretCipher: string | null,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await pool.query(
    `UPDATE login_challenges
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await pool.query(
    `INSERT INTO login_challenges (
       user_id, token_hash, purpose, expires_at, pending_secret_cipher
     )
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      hashChallengeToken(token),
      purpose,
      expiresAt,
      pendingSecretCipher,
    ],
  );

  return token;
}

export async function readOpenChallenge(
  req: Request,
): Promise<ChallengeRow | null> {
  const token = req.cookies?.[CHALLENGE_COOKIE];
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  const result = await pool.query<ChallengeRow>(
    `SELECT id, user_id, purpose, pending_secret_cipher, failed_attempts
     FROM login_challenges
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
       AND failed_attempts < $2
     LIMIT 1`,
    [hashChallengeToken(token), MAX_CHALLENGE_ATTEMPTS],
  );
  return result.rows[0] ?? null;
}

export async function consumeChallenge(id: number): Promise<void> {
  await pool.query(
    `UPDATE login_challenges SET used_at = NOW() WHERE id = $1`,
    [id],
  );
}

export async function recordChallengeFailure(id: number): Promise<void> {
  await pool.query(
    `UPDATE login_challenges
     SET failed_attempts = failed_attempts + 1,
         used_at = CASE
           WHEN failed_attempts + 1 >= $2 THEN NOW()
           ELSE used_at
         END
     WHERE id = $1
       AND used_at IS NULL`,
    [id, MAX_CHALLENGE_ATTEMPTS],
  );
}
