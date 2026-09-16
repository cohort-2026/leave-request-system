import { sendMail, loginOtp } from "../mail/index.js";
import { pool } from "../db.js";
import { hasOpenLoginOtp, issueLoginOtp } from "./tokens.js";

const RESEND_COOLDOWN_MS = 60 * 1000;
const lastSendByEmail = new Map<string, number>();

export async function sendLoginOtpEmail(
  to: string,
  code: string,
): Promise<void> {
  await sendMail({ to, ...loginOtp({ code }) });
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
// address exists. Only sends when a recent unused OTP already exists
// (password step succeeded). Failures to send are not returned.
export async function resendLoginOtp(email: string): Promise<void> {
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
  if (!user || user.status === "pending_verification") {
    return;
  }

  if (!(await hasOpenLoginOtp(user.id))) {
    return;
  }

  const code = await issueLoginOtp(user.id);
  try {
    await sendLoginOtpEmail(normalized, code);
  } catch {
    // sendMail already logged. Do not leak that this address exists.
  }
}
