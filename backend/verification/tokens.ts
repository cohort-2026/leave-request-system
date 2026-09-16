import { createHash, randomBytes } from "node:crypto";
import { pool } from "../db.js";

const TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newVerificationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashVerificationToken(token) };
}

export async function issueVerificationToken(userId: number): Promise<string> {
  const { token, hash } = newVerificationToken();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt],
  );

  return token;
}

export async function consumeVerificationToken(
  token: string,
): Promise<number | null> {
  const hash = hashVerificationToken(token);

  const consumed = await pool.query<{ user_id: number }>(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [hash],
  );
  if (consumed.rows[0]) {
    return consumed.rows[0].user_id;
  }

  // Same link clicked twice (or React Strict Mode in dev): treat an already
  // consumed token as success so the page does not show a false expiry.
  const existing = await pool.query<{ user_id: number }>(
    `SELECT user_id
     FROM email_verification_tokens
     WHERE token_hash = $1 AND used_at IS NOT NULL
     LIMIT 1`,
    [hash],
  );
  return existing.rows[0]?.user_id ?? null;
}
