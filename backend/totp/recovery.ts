import { createHash, randomBytes } from "node:crypto";
import { pool } from "../db.js";

const RECOVERY_COUNT = 8;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRecoveryCode(value: string): string | null {
  const compact = value.replace(/[\s-]+/g, "").toUpperCase();
  if (!/^[A-Z2-9]{8}$/.test(compact)) {
    return null;
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function hashRecoveryCode(userId: number, code: string): string {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) {
    throw new Error("Invalid recovery code format");
  }
  return createHash("sha256").update(`${userId}:${normalized}`).digest("hex");
}

function newRecoveryCode(): string {
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) {
    body += ALPHABET[byte % ALPHABET.length];
  }
  return `${body.slice(0, 4)}-${body.slice(4)}`;
}

export async function replaceRecoveryCodes(userId: number): Promise<string[]> {
  const codes: string[] = [];
  const hashes: string[] = [];
  while (codes.length < RECOVERY_COUNT) {
    const code = newRecoveryCode();
    const hash = hashRecoveryCode(userId, code);
    if (hashes.includes(hash)) {
      continue;
    }
    codes.push(code);
    hashes.push(hash);
  }

  await pool.query(`DELETE FROM totp_recovery_codes WHERE user_id = $1`, [
    userId,
  ]);

  for (const hash of hashes) {
    await pool.query(
      `INSERT INTO totp_recovery_codes (user_id, code_hash)
       VALUES ($1, $2)`,
      [userId, hash],
    );
  }

  return codes;
}

export async function consumeRecoveryCode(
  userId: number,
  code: string,
): Promise<boolean> {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) {
    return false;
  }
  const hash = hashRecoveryCode(userId, normalized);
  const result = await pool.query<{ id: number }>(
    `UPDATE totp_recovery_codes
     SET used_at = NOW()
     WHERE user_id = $1
       AND code_hash = $2
       AND used_at IS NULL
     RETURNING id`,
    [userId, hash],
  );
  return Boolean(result.rows[0]);
}
