import type { NextFunction, Request, Response } from "express";
import { pool } from "../db.js";
import { readSessionUserId, type Role, type UserRow } from "../session.js";

const NOT_SIGNED_IN = "Not signed in";

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
