import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { consumeOtp, issueOtp } from "../otp.js";
import { requireAuth } from "../middleware/auth.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  sessionCookieOptions,
  signSessionToken,
  toPublicUser,
  type UserRow,
} from "../session.js";

export const authRouter = Router();

const INVALID_LOGIN = "Invalid email or password";

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
const OTP_RE = /^\d{6}$/;

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

    await issueOtp(result.rows[0].id, result.rows[0].email, "email_verification");

    res.status(201).json(toPublicUser(result.rows[0]));
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

authRouter.post("/verify-email", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const code = asNonEmptyString(req.body?.code);

  if (!email || !code || !OTP_RE.test(code)) {
    res.status(400).json({ error: "A valid email and 6-digit code are required" });
    return;
  }

  const userId = await consumeOtp(email, code, "email_verification");
  if (!userId) {
    res.status(400).json({ error: "Invalid or expired verification code" });
    return;
  }

  const result = await pool.query<UserRow>(
    `UPDATE users
     SET status = 'active'
     WHERE id = $1 AND status = 'pending_verification'
     RETURNING id, email, role, display_name, status, company_name`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(400).json({ error: "Account is already verified" });
    return;
  }

  res.cookie(SESSION_COOKIE, signSessionToken(user.id), sessionCookieOptions);
  res.json(toPublicUser(user));
});

authRouter.post("/forgot-password", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const result = await pool.query<Pick<UserRow, "id" | "email">>(
    "SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );
  const user = result.rows[0];
  if (user) {
    await issueOtp(user.id, user.email, "password_reset");
  }

  res.json({ ok: true });
});

authRouter.post("/reset-password", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const code = asNonEmptyString(req.body?.code);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !code || !OTP_RE.test(code) || password.length < MIN_PASSWORD_LEN) {
    res.status(400).json({ error: "Email, 6-digit code, and an 8-character password are required" });
    return;
  }

  const userId = await consumeOtp(email, code, "password_reset");
  if (!userId) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
  res.json({ ok: true });
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

  const token = signSessionToken(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json(toPublicUser(user));
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(toPublicUser(req.user!));
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
