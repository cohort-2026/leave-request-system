import { appOrigin, sendMail, verifyEmail } from "../mail/index.js";
import { pool } from "../db.js";
import { issueVerificationToken } from "./tokens.js";

const RESEND_COOLDOWN_MS = 60 * 1000;
const lastSendByEmail = new Map<string, number>();

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${appOrigin()}/verify?token=${encodeURIComponent(token)}`;
  await sendMail({ to, ...verifyEmail({ verifyUrl }) });
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
export async function resendVerification(email: string): Promise<void> {
  const normalized = email.toLowerCase();
  if (onCooldown(normalized)) {
    return;
  }

  markSent(normalized);

  const result = await pool.query<{ id: number; status: string }>(
    `SELECT id, status
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [normalized],
  );
  const user = result.rows[0];
  if (!user || user.status !== "pending_verification") {
    return;
  }

  const token = await issueVerificationToken(user.id);
  try {
    await sendVerificationEmail(normalized, token);
  } catch {
    // sendMail already logged. Do not leak that this address exists.
  }
}
