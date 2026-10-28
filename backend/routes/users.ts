import { Router } from "express";
import { pool } from "../db.js";
import {
  requireAuth,
  requireRole,
  type AuthedUser,
} from "../middleware/auth.js";
import { toPublicUser, type UserRow } from "../session.js";
import { requireCompanyId, sameCompanyId } from "../tenancy.js";

export const usersRouter = Router();

const NOT_ALLOWED = "You are not allowed to do that";
const UNKNOWN_ROLE = "Unknown role";
const SELF_ROLE = "You cannot change your own role";
const LAST_ADMIN = "Cannot demote the last company admin";

const ASSIGNABLE_ROLES = ["staff", "manager", "company_admin"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

type PublicUserRow = Pick<
  UserRow,
  | "id"
  | "email"
  | "role"
  | "display_name"
  | "status"
  | "company_name"
  | "company_id"
>;

function isAssignableRole(value: unknown): value is AssignableRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

function canReadUser(
  actor: AuthedUser,
  row: Pick<UserRow, "id" | "role" | "company_id">,
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
    sameCompanyId(actor.company_id, row.company_id)
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

  const result = await pool.query<PublicUserRow>(
    `SELECT id, email, role, display_name, status, company_name, company_id
     FROM users
     LEFT JOIN departments
       ON departments.id = users.department_id
      AND departments.company_name = users.company_name
     WHERE users.id = $1
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

  res.json(toPublicCompanyUser(row));
});

usersRouter.patch(
  "/:id/role",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const actor = req.user!;
    const actorCompanyId = requireCompanyId(actor, res);
    if (actorCompanyId === null) {
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    if (!isAssignableRole(req.body?.role)) {
      res.status(400).json({ error: UNKNOWN_ROLE });
      return;
    }
    const nextRole: AssignableRole = req.body.role;

    const result = await changeCompanyUserRole({
      actorId: actor.id,
      actorCompanyId,
      targetId: id,
      nextRole,
    });

    if (result.ok === false) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(toPublicCompanyUser(result.user));
  },
);

usersRouter.patch(
  "/:id/department",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const actorCompany = req.user!.company_name?.trim() ?? "";
    if (!actorCompany) {
      res.status(403).json({ error: NOT_IN_COMPANY });
      return;
    }

    const id = Number(req.params.id);
    if (!isPositiveInteger(id)) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    const departmentIdValue = req.body?.departmentId;
    if (
      departmentIdValue !== null &&
      !isPositiveInteger(departmentIdValue)
    ) {
      res.status(400).json({ error: "Invalid department id" });
      return;
    }
    const departmentId: number | null = departmentIdValue;

    const user = await pool.query<Pick<UserRow, "id" | "company_name">>(
      `SELECT id, company_name
       FROM users
       WHERE id = $1`,
      [id],
    );
    const target = user.rows[0];
    if (!target) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (target.company_name !== actorCompany) {
      res.status(403).json({ error: NOT_ALLOWED });
      return;
    }

    if (departmentId !== null) {
      const department = await pool.query(
        `SELECT id
         FROM departments
         WHERE id = $1 AND company_name = $2`,
        [departmentId, actorCompany],
      );
      if (department.rowCount === 0) {
        res.status(400).json({ error: "Department must belong to your company" });
        return;
      }
    }

    const updated = await pool.query<PublicUserRow>(
      `UPDATE users
       SET department_id = $1
       WHERE id = $2 AND company_name = $3
       RETURNING id, email, role, display_name, status, company_name,
         department_id,
         (
           SELECT departments.name
           FROM departments
           WHERE departments.id = users.department_id
             AND departments.company_name = users.company_name
         ) AS department_name`,
      [departmentId, id, actorCompany],
    );
    if (updated.rowCount === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(toPublicCompanyUser(updated.rows[0]));
  },
);

type ChangeRoleResult =
  | { ok: true; user: PublicUserRow }
  | { ok: false; status: 403 | 404; error: string };

async function changeCompanyUserRole(input: {
  actorId: number;
  actorCompanyId: number;
  targetId: number;
  nextRole: AssignableRole;
}): Promise<ChangeRoleResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock this company's admins in id order first so two demotes cannot
    // remove the last admin or deadlock on row locks.
    await client.query(
      `SELECT id
       FROM users
       WHERE company_id = $1 AND role = 'company_admin'
       ORDER BY id
       FOR UPDATE`,
      [input.actorCompanyId],
    );

    const found = await client.query<PublicUserRow>(
      `SELECT id, email, role, display_name, status, company_name, company_id
       FROM users
       LEFT JOIN departments
         ON departments.id = users.department_id
        AND departments.company_name = users.company_name
       WHERE users.id = $1
       LIMIT 1
       FOR UPDATE OF users`,
      [input.targetId],
    );
    const target = found.rows[0];

    if (!target) {
      await client.query("ROLLBACK");
      return { ok: false, status: 404, error: "Not found" };
    }

    if (target.id === input.actorId) {
      await client.query("ROLLBACK");
      return { ok: false, status: 403, error: SELF_ROLE };
    }

    if (target.role === "platform") {
      await client.query("ROLLBACK");
      return { ok: false, status: 403, error: NOT_ALLOWED };
    }

    if (!sameCompanyId(target.company_id, input.actorCompanyId)) {
      await client.query("ROLLBACK");
      return { ok: false, status: 403, error: NOT_ALLOWED };
    }

    if (
      target.role === "company_admin" &&
      input.nextRole !== "company_admin"
    ) {
      const admins = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users
         WHERE company_id = $1 AND role = 'company_admin'`,
        [input.actorCompanyId],
      );
      if (Number(admins.rows[0]?.count) <= 1) {
        await client.query("ROLLBACK");
        return { ok: false, status: 403, error: LAST_ADMIN };
      }
    }

    if (target.role === input.nextRole) {
      await client.query("COMMIT");
      return { ok: true, user: target };
    }

    await client.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, email, role, display_name, status, company_name, company_id`,
      [input.nextRole, input.targetId],
    );
    if (target.role === "manager" && input.nextRole !== "manager") {
      await client.query(
        `UPDATE departments
         SET manager_id = NULL
         WHERE company_name = $1 AND manager_id = $2`,
        [input.actorCompany, input.targetId],
      );
    }
    await client.query("COMMIT");
    return { ok: true, user: { ...target, role: input.nextRole } };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
