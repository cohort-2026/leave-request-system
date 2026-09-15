import { createHash, randomInt } from "node:crypto";
import { pool } from "./db.js";

export type OtpPurpose = "email_verification" | "password_reset";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function makeCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function deliverOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.warn(`[OTP development fallback] ${purpose} for ${email}: ${code}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject:
        purpose === "email_verification"
          ? "Verify your Leave Request account"
          : "Reset your Leave Request password",
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to send verification email");
  }
}

export async function issueOtp(
  userId: number,
  email: string,
  purpose: OtpPurpose,
): Promise<void> {
  const code = makeCode();
  await pool.query(
    `UPDATE auth_otps
     SET consumed_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose],
  );
  await pool.query(
    `INSERT INTO auth_otps (user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)`,
    [userId, purpose, hashCode(code), OTP_TTL_MINUTES],
  );
  await deliverOtp(email, code, purpose);
}

export async function consumeOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
): Promise<number | null> {
  const result = await pool.query<{ id: number; user_id: number; code_hash: string; attempts: number }>(
    `SELECT otp.id, otp.user_id, otp.code_hash, otp.attempts
     FROM auth_otps otp
     INNER JOIN users u ON u.id = otp.user_id
     WHERE lower(u.email) = lower($1)
       AND otp.purpose = $2
       AND otp.consumed_at IS NULL
       AND otp.expires_at > NOW()
     ORDER BY otp.created_at DESC
     LIMIT 1`,
    [email, purpose],
  );
  const otp = result.rows[0];

  if (!otp || !/^\d{6}$/.test(code) || otp.attempts >= MAX_ATTEMPTS) {
    return null;
  }

  if (hashCode(code) !== otp.code_hash) {
    await pool.query("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = $1", [otp.id]);
    return null;
  }

  await pool.query("UPDATE auth_otps SET consumed_at = NOW() WHERE id = $1", [otp.id]);
  return otp.user_id;
}