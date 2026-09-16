import type { Request, Response } from "express";
import { pool } from "../db.js";
import type { UserRow } from "../session.js";
import {
  clearChallengeCookie,
  consumeChallenge,
  issueChallenge,
  readOpenChallenge,
  recordChallengeFailure,
  setChallengeCookie,
} from "./challenge.js";
import { decryptSecret, encryptSecret } from "./encrypt.js";
import {
  normalizeTotpCode,
  otpauthUrl,
  qrSvgForUrl,
  newTotpSecret,
  stepForDelta,
  verifyTotpCode,
} from "./otp.js";
import { consumeRecoveryCode, replaceRecoveryCodes } from "./recovery.js";

export { clearChallengeCookie } from "./challenge.js";

const MAX_TOTP_ATTEMPTS = 5;

export type TotpStart =
  | {
      totpEnrollmentRequired: true;
      otpauthUrl: string;
      secret: string;
      qrSvg: string;
    }
  | { totpRequired: true };

type TotpRow = {
  user_id: number;
  secret_cipher: string;
  last_step: string | number | null;
  failed_attempts: number;
  locked_until: Date | null;
};

export async function isEnrolled(userId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM user_totp WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return Boolean(result.rows[0]);
}

export async function startTotpAfterPassword(
  user: UserRow,
  res: Response,
): Promise<TotpStart> {
  if (await isEnrolled(user.id)) {
    const token = await issueChallenge(user.id, "login", null);
    setChallengeCookie(res, token);
    return { totpRequired: true };
  }

  const secret = newTotpSecret();
  const token = await issueChallenge(user.id, "enroll", encryptSecret(secret));
  setChallengeCookie(res, token);
  const url = otpauthUrl(user.email, secret);
  return {
    totpEnrollmentRequired: true,
    otpauthUrl: url,
    secret,
    qrSvg: qrSvgForUrl(url),
  };
}

async function matchingUser(
  challengeUserId: number,
  email: string,
): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, display_name, status, company_name
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [challengeUserId],
  );
  const user = result.rows[0];
  if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }
  return user;
}

export async function confirmTotpEnroll(
  req: Request,
  res: Response,
  email: string,
  rawCode: string,
): Promise<{ user: UserRow; recoveryCodes: string[] } | null> {
  const challenge = await readOpenChallenge(req);
  if (!challenge || challenge.purpose !== "enroll") {
    return null;
  }

  const user = await matchingUser(challenge.user_id, email);
  if (!user || user.status === "pending_verification") {
    return null;
  }

  if (await isEnrolled(user.id)) {
    return null;
  }

  const code = normalizeTotpCode(rawCode);
  if (!code || !challenge.pending_secret_cipher) {
    await recordChallengeFailure(challenge.id);
    return null;
  }

  let secret: string;
  try {
    secret = decryptSecret(challenge.pending_secret_cipher);
  } catch {
    await recordChallengeFailure(challenge.id);
    return null;
  }

  const delta = verifyTotpCode(user.email, secret, code);
  if (delta === null) {
    await recordChallengeFailure(challenge.id);
    return null;
  }

  await pool.query(
    `INSERT INTO user_totp (user_id, secret_cipher, enrolled_at, last_step, failed_attempts)
     VALUES ($1, $2, NOW(), $3, 0)`,
    [user.id, challenge.pending_secret_cipher, stepForDelta(delta)],
  );

  const recoveryCodes = await replaceRecoveryCodes(user.id);
  await consumeChallenge(challenge.id);
  clearChallengeCookie(res);
  return { user, recoveryCodes };
}

async function loadTotp(userId: number): Promise<TotpRow | null> {
  const result = await pool.query<TotpRow>(
    `SELECT user_id, secret_cipher, last_step, failed_attempts, locked_until
     FROM user_totp
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

function isLocked(row: TotpRow): boolean {
  return Boolean(row.locked_until && new Date(row.locked_until) > new Date());
}

async function recordTotpFailure(userId: number): Promise<void> {
  await pool.query(
    `UPDATE user_totp
     SET failed_attempts = failed_attempts + 1,
         locked_until = CASE
           WHEN failed_attempts + 1 >= $2 THEN NOW() + INTERVAL '15 minutes'
           ELSE locked_until
         END
     WHERE user_id = $1`,
    [userId, MAX_TOTP_ATTEMPTS],
  );
}

async function markTotpSuccess(userId: number, step: number): Promise<void> {
  await pool.query(
    `UPDATE user_totp
     SET failed_attempts = 0,
         locked_until = NULL,
         last_step = $2
     WHERE user_id = $1`,
    [userId, step],
  );
}

export async function verifyTotpLogin(
  req: Request,
  res: Response,
  email: string,
  rawCode: string,
): Promise<UserRow | null> {
  const challenge = await readOpenChallenge(req);
  if (!challenge || challenge.purpose !== "login") {
    return null;
  }

  const user = await matchingUser(challenge.user_id, email);
  if (!user || user.status === "pending_verification") {
    return null;
  }

  const totp = await loadTotp(user.id);
  if (!totp || isLocked(totp)) {
    if (totp && isLocked(totp)) {
      await recordChallengeFailure(challenge.id);
    }
    return null;
  }

  const code = normalizeTotpCode(rawCode);
  if (!code) {
    await recordChallengeFailure(challenge.id);
    await recordTotpFailure(user.id);
    return null;
  }

  let secret: string;
  try {
    secret = decryptSecret(totp.secret_cipher);
  } catch {
    await recordChallengeFailure(challenge.id);
    return null;
  }

  const delta = verifyTotpCode(user.email, secret, code);
  const step = delta === null ? null : stepForDelta(delta);
  const lastStep =
    totp.last_step === null || totp.last_step === undefined
      ? null
      : Number(totp.last_step);

  if (delta === null || step === null || step === lastStep) {
    await recordChallengeFailure(challenge.id);
    await recordTotpFailure(user.id);
    return null;
  }

  await markTotpSuccess(user.id, step);
  await consumeChallenge(challenge.id);
  clearChallengeCookie(res);
  return user;
}

export async function verifyTotpRecovery(
  req: Request,
  res: Response,
  email: string,
  rawCode: string,
): Promise<UserRow | null> {
  const challenge = await readOpenChallenge(req);
  if (!challenge || challenge.purpose !== "login") {
    return null;
  }

  const user = await matchingUser(challenge.user_id, email);
  if (!user || user.status === "pending_verification") {
    return null;
  }

  const totp = await loadTotp(user.id);
  if (!totp) {
    return null;
  }

  const ok = await consumeRecoveryCode(user.id, rawCode);
  if (!ok) {
    await recordChallengeFailure(challenge.id);
    return null;
  }

  await pool.query(
    `UPDATE user_totp
     SET failed_attempts = 0,
         locked_until = NULL
     WHERE user_id = $1`,
    [user.id],
  );
  await consumeChallenge(challenge.id);
  clearChallengeCookie(res);
  return user;
}
