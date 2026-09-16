import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  sessionCookieOptions,
  signSessionToken,
  toPublicUser,
  type UserRow,
} from "../session.js";
import {
  consumeVerificationToken,
  issueVerificationToken,
  resendVerification,
  sendVerificationEmail,
} from "../verification/index.js";

export const authRouter = Router();

const INVALID_LOGIN = "Invalid email or password";
const EMAIL_NOT_VERIFIED =
  "Email not verified. Check your inbox (Mailpit in local dev) or request a new link.";
const VERIFY_LINK_BAD = "This verification link is invalid or has expired.";
const RESEND_OK =
  "If that email is registered and still needs verifying, we sent a link.";

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

  const token = signSessionToken(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json(toPublicUser(user));
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

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(toPublicUser(req.user!));
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
