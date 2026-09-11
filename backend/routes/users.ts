import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, type AuthedUser } from "../middleware/auth.js";
import { toPublicUser, type UserRow } from "../session.js";

export const usersRouter = Router();

function canReadUser(
  actor: AuthedUser,
  row: Pick<UserRow, "id" | "role" | "company_name">,
): boolean {
  if (actor.id === row.id) {
    return true;
  }
  if (actor.role === "platform") {
    return true;
  }
  if (actor.role === "staff") {
    return false;
  }
  if (
    (actor.role === "manager" || actor.role === "company_admin") &&
    actor.company_name &&
    row.company_name &&
    actor.company_name === row.company_name
  ) {
    return true;
  }
  return false;
}

usersRouter.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid user id" });
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
    [id],
  );
  const row = result.rows[0];

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!canReadUser(req.user!, row)) {
    res.status(403).json({ error: "You are not allowed to do that" });
    return;
  }

  res.json(toPublicUser(row));
});
