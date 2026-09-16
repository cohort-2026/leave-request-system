import { createHash, randomInt } from "node:crypto";
import { pool } from "../db.js";

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function normalizeOtpCode(value: string): string | null {
  const digits = value.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(digits)) {
    return null;
  }
  return digits;
}

export function hashLoginOtp(userId: number, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

export function newLoginOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function issueLoginOtp(userId: number): Promise<string> {
  const code = newLoginOtpCode();
  const hash = hashLoginOtp(userId, code);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await pool.query(
    `UPDATE login_otp_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await pool.query(
    `INSERT INTO login_otp_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt],
  );

  return code;
}

export async function consumeLoginOtp(
  userId: number,
  code: string,
): Promise<boolean> {
  const hash = hashLoginOtp(userId, code);

  const consumed = await pool.query<{ user_id: number }>(
    `UPDATE login_otp_tokens
     SET used_at = NOW()
     WHERE user_id = $1
       AND token_hash = $2
       AND used_at IS NULL
       AND expires_at > NOW()
       AND failed_attempts < $3
     RETURNING user_id`,
    [userId, hash, MAX_ATTEMPTS],
  );
  if (consumed.rows[0]) {
    return true;
  }

  // Same code posted twice (or React Strict Mode in dev): treat a recently
  // consumed matching hash as success so the page does not show a false fail.
  const existing = await pool.query<{ user_id: number }>(
    `SELECT user_id
     FROM login_otp_tokens
     WHERE user_id = $1
       AND token_hash = $2
       AND used_at IS NOT NULL
       AND failed_attempts < $3
       AND used_at > NOW() - INTERVAL '2 minutes'
     LIMIT 1`,
    [userId, hash, MAX_ATTEMPTS],
  );
  return Boolean(existing.rows[0]);
}

export async function recordLoginOtpFailure(userId: number): Promise<void> {
  await pool.query(
    `UPDATE login_otp_tokens
     SET failed_attempts = failed_attempts + 1,
         used_at = CASE
           WHEN failed_attempts + 1 >= $2 THEN NOW()
           ELSE used_at
         END
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [userId, MAX_ATTEMPTS],
  );
}

export async function hasOpenLoginOtp(userId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM login_otp_tokens
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > NOW()
       AND failed_attempts < $2
     LIMIT 1`,
    [userId, MAX_ATTEMPTS],
  );
  return Boolean(result.rows[0]);
}
