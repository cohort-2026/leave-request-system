import { createHash, randomBytes } from "node:crypto";
import { pool } from "../db.js";

const TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token) };
}

export async function issueResetToken(userId: number): Promise<string> {
  const { token, hash } = newResetToken();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt],
  );

  return token;
}

export async function completePasswordReset(
  token: string,
  passwordHash: string,
): Promise<boolean> {
  const hash = hashResetToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const consumed = await client.query<{ user_id: number }>(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       RETURNING user_id`,
      [hash],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
    await client.query(`DELETE FROM login_challenges WHERE user_id = $1`, [
      userId,
    ]);

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
