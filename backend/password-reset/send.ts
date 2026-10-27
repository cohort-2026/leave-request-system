import { appOrigin, resetPasswordEmail, sendMail } from "../mail/index.js";
import { pool } from "../db.js";
import { issueResetToken } from "./tokens.js";

const RESEND_COOLDOWN_MS = 60 * 1000;
const lastSendByEmail = new Map<string, number>();

export async function sendResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({ to, ...resetPasswordEmail({ resetUrl }) });
  markSent(to.toLowerCase());
}

function onCooldown(email: string): boolean {
  const last = lastSendByEmail.get(email);
  return last !== undefined && Date.now() - last < RESEND_COOLDOWN_MS;
}

function markSent(email: string): void {
  lastSendByEmail.set(email, Date.now());
}

// Always safe to call from a public route: does not reveal whether the
// address exists. Failures to send are logged, not returned to the client.
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.toLowerCase();
  if (onCooldown(normalized)) {
    return;
  }

  markSent(normalized);

  const result = await pool.query<{ id: number }>(
    `SELECT id
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [normalized],
  );
  const user = result.rows[0];
  if (!user) {
    return;
  }

  const token = await issueResetToken(user.id);
  try {
    await sendResetEmail(normalized, token);
  } catch {
    // sendMail already logged. Do not leak that this address exists.
  }
}
