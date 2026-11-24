import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId } from "../tenancy.js";

export const departmentsRouter = Router();

type DepartmentRow = {
  id: number;
  name: string;
  manager_id: number | null;
  manager_name: string | null;
  max_off: number | null;
};

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseMaxOff(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && isNonNegativeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

function toPublicDepartment(row: DepartmentRow) {
  return {
    id: row.id,
    name: row.name,
    managerId: row.manager_id,
    managerName: row.manager_name,
    maxOff: row.max_off,
  };
}

departmentsRouter.patch(
  "/:id",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const departmentId = Number(req.params.id);
    if (!isPositiveInteger(departmentId)) {
      res.status(400).json({ error: "Invalid department id" });
      return;
    }

    if (
      typeof req.body !== "object" ||
      req.body === null ||
      !Object.prototype.hasOwnProperty.call(req.body, "maxOff")
    ) {
      res.status(400).json({ error: "maxOff is required" });
      return;
    }

    const maxOff = parseMaxOff(req.body.maxOff);
    if (maxOff === undefined) {
      res.status(400).json({
        error: "maxOff must be a non-negative integer or null",
      });
      return;
    }

    const updated = await pool.query<DepartmentRow>(
      `UPDATE departments
       SET max_off = $1
       WHERE id = $2 AND company_id = $3
       RETURNING id, name, manager_id,
         (
           SELECT COALESCE(users.display_name, users.email)
           FROM users
           WHERE users.id = departments.manager_id
             AND users.company_id = departments.company_id
         ) AS manager_name,
         max_off`,
      [maxOff, departmentId, companyId],
    );
    if (updated.rowCount === 0) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    res.json(toPublicDepartment(updated.rows[0]));
  },
);
