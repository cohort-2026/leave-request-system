import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import { pool } from "../db.js";
import type { UserRow } from "../session.js";
import {
  beginEnrollmentAfterReset,
  type TotpEnrollmentPayload,
} from "../totp/index.js";

const TTL_MS = 60 * 60 * 1000;

export function hashTotpResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newTotpResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashTotpResetToken(token) };
}

export async function issueTotpResetToken(userId: number): Promise<string> {
  const { token, hash } = newTotpResetToken();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await pool.query(
    `UPDATE totp_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await pool.query(
    `INSERT INTO totp_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt],
  );

  return token;
}

export type TotpResetConfirm =
  | { ok: true; totpReset: true; enrollment: TotpEnrollmentPayload }
  | { ok: true; totpReset: true };

export async function completeTotpReset(
  token: string,
  sessionUserId: number | null,
  res: Response,
): Promise<TotpResetConfirm | null> {
  const hash = hashTotpResetToken(token);
  const client = await pool.connect();

  let userId: number | undefined;
  try {
    await client.query("BEGIN");

    const consumed = await client.query<{ user_id: number }>(
      `UPDATE totp_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       RETURNING user_id`,
      [hash],
    );
    userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE totp_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
    await client.query(`DELETE FROM totp_recovery_codes WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(`DELETE FROM user_totp WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM login_challenges WHERE user_id = $1`, [
      userId,
    ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (sessionUserId !== userId) {
    return { ok: true, totpReset: true };
  }

  const result = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, display_name, status, company_name, company_id
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) {
    return { ok: true, totpReset: true };
  }

  const enrollment = await beginEnrollmentAfterReset(user, res);
  return { ok: true, totpReset: true, enrollment };
}
