import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  readSessionUserId,
  sessionCookieOptions,
  signSessionToken,
  toPublicUser,
  type UserRow,
} from "../session.js";
import {
  clearChallengeCookie,
  confirmTotpEnroll,
  confirmTotpEnrollForSession,
  pendingEnrollmentFor,
  startTotpAfterPassword,
  verifyTotpLogin,
  verifyTotpRecovery,
} from "../totp/index.js";
import {
  consumeVerificationToken,
  issueVerificationToken,
  resendVerification,
  sendVerificationEmail,
} from "../verification/index.js";
import {
  completePasswordReset,
  requestPasswordReset,
} from "../password-reset/index.js";
import {
  completeTotpReset,
  requestTotpReset,
} from "../totp-reset/index.js";

export const authRouter = Router();

const INVALID_LOGIN = "Invalid email or password";
const EMAIL_NOT_VERIFIED =
  "Email not verified. Check your inbox (Mailpit in local dev) or request a new link.";
const LOGIN_TOTP_BAD = "This authenticator code is invalid or has expired.";
const VERIFY_LINK_BAD = "This verification link is invalid or has expired.";
const RESEND_OK =
  "If that email is registered and still needs verifying, we sent a link.";
const RESET_LINK_BAD = "This reset link is invalid or has expired.";
const FORGOT_OK =
  "If that email is registered, we sent a reset link.";
const TOTP_RESET_LINK_BAD =
  "This authenticator reset link is invalid or has expired.";
const TOTP_RESET_REQUEST_OK =
  "Check your inbox (Mailpit in local dev) for a link to reset your authenticator.";
const CHANGE_PASSWORD_BAD = "Current password is incorrect";
const MAX_DISPLAY_NAME_LEN = 120;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 1024;
const MIN_PASSWORD_LEN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post("/register", async (req, res) => {
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;

  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const email = rawEmail.trim();
  const password = rawPassword;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  if (email.length > MAX_EMAIL_LEN || password.length > MAX_PASSWORD_LEN) {
    res.status(400).json({ error: "Email or password too long" });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < MIN_PASSWORD_LEN) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, $3, 'pending_verification')
       RETURNING id, email, role, display_name, status, company_name`,
      [email.toLowerCase(), hash, "staff"],
    );
    const user = result.rows[0];
    const token = await issueVerificationToken(user.id);
    try {
      await sendVerificationEmail(user.email, token);
    } catch {
      res.status(500).json({ error: "Could not send verification email" });
      return;
    }

    res.status(201).json(toPublicUser(user));
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String(err.code)
        : "";
    if (code === "23505") {
      res.status(409).json({ error: "Email already used" });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const password = asNonEmptyString(req.body?.password);

  if (!email || !password) {
    res.status(401).json({ error: INVALID_LOGIN });
    return;
  }

  const result = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, display_name, status, company_name
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );
  const user = result.rows[0];

  if (!user) {
    res.status(401).json({ error: INVALID_LOGIN });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    res.status(401).json({ error: INVALID_LOGIN });
    return;
  }

  if (user.status === "pending_verification") {
    res.status(403).json({ error: EMAIL_NOT_VERIFIED });
    return;
  }

  clearSessionCookie(res);
  const challenge = await startTotpAfterPassword(user, res);
  res.json(challenge);
});

authRouter.post("/verify-email", async (req, res) => {
  const token = asNonEmptyString(req.body?.token);
  if (!token) {
    res.status(400).json({ error: VERIFY_LINK_BAD });
    return;
  }

  const userId = await consumeVerificationToken(token);
  if (userId === null) {
    res.status(400).json({ error: VERIFY_LINK_BAD });
    return;
  }

  await pool.query(
    `UPDATE users
     SET status = 'active'
     WHERE id = $1 AND status = 'pending_verification'`,
    [userId],
  );

  res.json({ ok: true });
});

authRouter.post("/resend-verification", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  await resendVerification(email);
  res.json({ ok: true, message: RESEND_OK });
});

authRouter.post("/forgot-password", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  await requestPasswordReset(email);
  res.json({ ok: true, message: FORGOT_OK });
});

authRouter.post("/reset-password", async (req, res) => {
  const token = asNonEmptyString(req.body?.token);
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!token) {
    res.status(400).json({ error: RESET_LINK_BAD });
    return;
  }

  if (password.length > MAX_PASSWORD_LEN) {
    res.status(400).json({ error: "Email or password too long" });
    return;
  }

  if (password.length < MIN_PASSWORD_LEN) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const updated = await completePasswordReset(token, hash);
  if (!updated) {
    res.status(400).json({ error: RESET_LINK_BAD });
    return;
  }

  clearSessionCookie(res);
  clearChallengeCookie(res);
  res.json({ ok: true });
});

authRouter.post("/login/totp/enroll", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const code = asNonEmptyString(req.body?.code);

  if (!email || !code) {
    res.status(400).json({ error: LOGIN_TOTP_BAD });
    return;
  }

  const enrolled = await confirmTotpEnroll(req, res, email, code);
  if (!enrolled) {
    res.status(400).json({ error: LOGIN_TOTP_BAD });
    return;
  }

  const token = signSessionToken(enrolled.user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json({
    ...toPublicUser(enrolled.user),
    recoveryCodes: enrolled.recoveryCodes,
  });
});

authRouter.post("/login/totp", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const recoveryCode = asNonEmptyString(req.body?.recoveryCode);
  const code = asNonEmptyString(req.body?.code);

  if (!email || (!code && !recoveryCode) || (code && recoveryCode)) {
    res.status(400).json({ error: LOGIN_TOTP_BAD });
    return;
  }

  if (recoveryCode) {
    const reset = await verifyTotpRecovery(req, res, email, recoveryCode);
    if (!reset) {
      res.status(400).json({ error: LOGIN_TOTP_BAD });
      return;
    }
    res.json(reset);
    return;
  }

  const user = await verifyTotpLogin(req, res, email, code!);
  if (!user) {
    res.status(400).json({ error: LOGIN_TOTP_BAD });
    return;
  }

  const token = signSessionToken(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json(toPublicUser(user));
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(toPublicUser(req.user!));
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  if (typeof req.body?.displayName !== "string") {
    res.status(400).json({ error: "Display name required" });
    return;
  }

  const displayName = req.body.displayName.trim();
  if (displayName.length > MAX_DISPLAY_NAME_LEN) {
    res.status(400).json({ error: "Display name is too long" });
    return;
  }

  const storedName = displayName.length > 0 ? displayName : null;
  const result = await pool.query<UserRow>(
    `UPDATE users
     SET display_name = $1
     WHERE id = $2
     RETURNING id, email, password_hash, role, display_name, status, company_name`,
    [storedName, req.user!.id],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    display_name: user.display_name,
    status: user.status,
    company_name: user.company_name,
  };
  res.json(toPublicUser(user));
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const currentPassword =
    typeof req.body?.currentPassword === "string"
      ? req.body.currentPassword
      : "";
  const newPassword =
    typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password required" });
    return;
  }

  if (newPassword.length > MAX_PASSWORD_LEN) {
    res.status(400).json({ error: "Email or password too long" });
    return;
  }

  if (newPassword.length < MIN_PASSWORD_LEN) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const result = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, display_name, status, company_name
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.user!.id],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  const currentMatches = await bcrypt.compare(
    currentPassword,
    user.password_hash,
  );
  if (!currentMatches) {
    res.status(400).json({ error: CHANGE_PASSWORD_BAD });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    hash,
    user.id,
  ]);
  await pool.query(`DELETE FROM login_challenges WHERE user_id = $1`, [
    user.id,
  ]);

  res.json({ ok: true });
});

authRouter.post("/totp/reset-request", requireAuth, async (req, res) => {
  try {
    await requestTotpReset(req.user!.id, req.user!.email);
  } catch {
    res.status(500).json({ error: "Could not send authenticator reset email" });
    return;
  }

  res.json({ ok: true, message: TOTP_RESET_REQUEST_OK });
});

authRouter.post("/totp/reset-confirm", async (req, res) => {
  const token = asNonEmptyString(req.body?.token);
  if (!token) {
    res.status(400).json({ error: TOTP_RESET_LINK_BAD });
    return;
  }

  const sessionUserId = readSessionUserId(req);
  const result = await completeTotpReset(token, sessionUserId, res);
  if (!result) {
    res.status(400).json({ error: TOTP_RESET_LINK_BAD });
    return;
  }

  if ("enrollment" in result) {
    res.json(result.enrollment);
    return;
  }

  res.json({ ok: true, totpReset: true });
});

authRouter.get("/totp/enrollment", requireAuth, async (req, res) => {
  const enrollment = await pendingEnrollmentFor(
    req,
    req.user!.id,
    req.user!.email,
  );
  if (!enrollment) {
    res.status(404).json({ error: "No authenticator enrollment pending." });
    return;
  }

  res.json(enrollment);
});

authRouter.post("/totp/enroll", requireAuth, async (req, res) => {
  const code = asNonEmptyString(req.body?.code);
  if (!code) {
    res.status(400).json({ error: LOGIN_TOTP_BAD });
    return;
  }

  const result = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, display_name, status, company_name
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.user!.id],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  const enrolled = await confirmTotpEnrollForSession(req, res, user, code);
  if (!enrolled) {
    res.status(400).json({ error: LOGIN_TOTP_BAD });
    return;
  }

  res.json({
    ...toPublicUser(enrolled.user),
    recoveryCodes: enrolled.recoveryCodes,
  });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  clearChallengeCookie(res);
  res.json({ ok: true });
});
