import { Router } from "express";
import bcrypt from "bcrypt";
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

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
authRouter.post("/register", async (req, res) => {
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;

  // 1. Present check - must be strings
  if (typeof rawEmail!== 'string' || typeof rawPassword!== 'string') {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const email = rawEmail.trim();
  const password = rawPassword; // do NOT trim password - emoji/spaces allowed

  // 2. Empty check
  if (!email ||!password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  // 3. Huge check - fail cleanly, don't crash (8000 must fail)
  // We allow up to 1024 chars - enough for emoji, but 8000 is rejected
  const MAX_EMAIL_LEN = 254;
  const MAX_PASSWORD_LEN = 1024;
  const MIN_PASSWORD_LEN = 8; // Monday minimum default

  if (email.length > MAX_EMAIL_LEN || password.length > MAX_PASSWORD_LEN) {
    res.status(400).json({ error: "Email or password too long" });
    return;
  }

  // 4. Email looks like an email (simple server check, ignore browser)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  // 5. Password Monday minimum
  if (password.length < MIN_PASSWORD_LEN) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters` });
    return;
  }

  try {
    const exists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (exists.rows.length > 0) {
      res.status(409).json({ error: "Email already used" });
      return;
    }

    // Only hash AFTER all validation, so huge/empty never hits bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query<UserRow>(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
      [email.toLowerCase(), passwordHash, "staff"]
    );

    res.status(201).json(toPublicUser(result.rows[0]));
    return;
  } catch (err: any) {
  if (err?.code === "23505" || String(err?.message || "").includes("duplicate key")) {
    res.status(409).json({ error: "Email already used" });
    return;
  }
  res.status(500).json({ error: "Server error" });
  return;
}
});