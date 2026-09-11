import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  readSessionUserId,
  sessionCookieOptions,
  signSessionToken,
  toPublicUser,
  type UserRow,
} from "../session.js";

export const authRouter = Router();

const INVALID_LOGIN = "Invalid email or password";
const UNAUTHORIZED = "Unauthorized";

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
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, role`,
      [email.toLowerCase(), hash, "staff"],
    );

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

authRouter.get("/me", async (req, res) => {
  const userId = readSessionUserId(req);
  if (userId === null) {
    res.status(401).json({ error: UNAUTHORIZED });
    return;
  }

  const result = await pool.query<Pick<UserRow, "id" | "email" | "role">>(
    `SELECT id, email, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );
  const user = result.rows[0];

  if (!user) {
    res.status(401).json({ error: UNAUTHORIZED });
    return;
  }

  res.json(toPublicUser(user));
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
