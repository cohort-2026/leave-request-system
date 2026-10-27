import { appOrigin, resetAuthenticatorEmail, sendMail } from "../mail/index.js";
import { issueTotpResetToken } from "./tokens.js";

const RESEND_COOLDOWN_MS = 60 * 1000;
const lastSendByUserId = new Map<number, number>();

export async function sendTotpResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const resetUrl = `${appOrigin()}/reset-authenticator?token=${encodeURIComponent(token)}`;
  await sendMail({ to, ...resetAuthenticatorEmail({ resetUrl }) });
}

function onCooldown(userId: number): boolean {
  const last = lastSendByUserId.get(userId);
  return last !== undefined && Date.now() - last < RESEND_COOLDOWN_MS;
}

function markSent(userId: number): void {
  lastSendByUserId.set(userId, Date.now());
}

// Signed-in only. Does not wipe TOTP; the emailed link does that.
export async function requestTotpReset(
  userId: number,
  email: string,
): Promise<"sent" | "cooldown"> {
  if (onCooldown(userId)) {
    return "cooldown";
  }

  const token = await issueTotpResetToken(userId);
  await sendTotpResetEmail(email, token);
  markSent(userId);
  return "sent";
}
