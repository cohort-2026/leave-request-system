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
