import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { pool } from "../db.js";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
  toPublicUser,
  type UserRow,
} from "../session.js";

export const authRouter = Router();

const INVALID_LOGIN = "Invalid email or password";
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

authRouter.post("/forgot-password", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const response = {
    message: "If an account exists, a password reset link has been created.",
  };

  if (!email) {
    res.json(response);
    return;
  }

  const result = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );
  const user = result.rows[0];

  if (!user) {
    res.json(response);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashResetToken(rawToken), new Date(Date.now() + RESET_TOKEN_TTL_MS)],
  );

  // Until an email provider is configured, expose the link for local testing.
  res.json(
    process.env.NODE_ENV === "production"
      ? response
      : { ...response, resetUrl: `/reset-password?token=${rawToken}` },
  );
});

authRouter.post("/reset-password", async (req, res) => {
  const token = asNonEmptyString(req.body?.token);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!token || password.length < 8) {
    res.status(400).json({ error: "A valid token and password of at least 8 characters are required." });
    return;
  }

  const tokenResult = await pool.query<{ id: number; user_id: number }>(
    `SELECT id, user_id
     FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [hashResetToken(token)],
  );
  const resetToken = tokenResult.rows[0];

  if (!resetToken) {
    res.status(400).json({ error: "This reset link is invalid or has expired." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, resetToken.user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [resetToken.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  res.json({ message: "Password updated. You can now sign in." });
});

authRouter.post("/login", async (req, res) => {
  const email = asNonEmptyString(req.body?.email);
  const password = asNonEmptyString(req.body?.password);

  if (!email || !password) {
    res.status(401).json({ error: INVALID_LOGIN });
    return;
  }

  const result = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role
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
