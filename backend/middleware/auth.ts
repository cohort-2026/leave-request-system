import type { NextFunction, Request, Response } from "express";
import { pool } from "../db.js";
import { readSessionUserId, type Role, type UserRow } from "../session.js";

const NOT_SIGNED_IN = "Not signed in";
const NOT_ALLOWED = "You are not allowed to do that";

export type AuthedUser = {
  id: number;
  email: string;
  role: Role;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = readSessionUserId(req);
  if (userId === null) {
    res.status(401).json({ error: NOT_SIGNED_IN });
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
    res.status(401).json({ error: NOT_SIGNED_IN });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  next();
}

// Must run after requireAuth: it reads req.user, it does not set it.
// 401 = we don't know who you are. 403 = we know, and the answer is no.
// Never mix the two up here.
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Defensive only: if this ever runs without requireAuth first,
    // treat it as "not signed in", not a 500.
    if (!req.user) {
      res.status(401).json({ error: NOT_SIGNED_IN });
      return;
    }

    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: NOT_ALLOWED });
      return;
    }

    next();
  };
}
