import type { NextFunction, Request, Response } from "express";
import { pool } from "../db.js";
import {
  readSessionUserId,
  type Role,
  type UserRow,
} from "../session.js";

const NOT_SIGNED_IN = "Not signed in";
const NOT_ALLOWED = "You are not allowed to do that";

export type AuthedUser = {
  id: number;
  email: string;
  role: Role;
  display_name: string | null;
  status: string;
  company_name: string | null;
};

declare global {
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

  const result = await pool.query<
    Pick<
      UserRow,
      "id" | "email" | "role" | "display_name" | "status" | "company_name"
    >
  >(
    `SELECT id, email, role, display_name, status, company_name
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
    display_name: user.display_name,
    status: user.status,
    company_name: user.company_name,
  };

  next();
}

// Must run after requireAuth. 401 = we don't know who you are.
// 403 = we know, and the answer is no.
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
