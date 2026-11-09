import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId } from "../tenancy.js";

export const leaveTypesRouter = Router();
export const adminLeaveTypesRouter = Router();

const MAX_NAME_LEN = 80;
const MAX_INT = 2_147_483_647;

type LeaveTypeRow = {
  id: number;
  name: string;
  default_days: number;
  allowance_period: string;
  is_active: boolean;
  allow_backdate: boolean;
  requires_document_after_days: number | null;
};

type LeaveTypeFields = {
  name?: string;
  defaultDays?: number;
  isActive?: boolean;
  allowBackdate?: boolean;
  requiresDocumentAfterDays?: number | null;
};

function toPublicLeaveType(row: LeaveTypeRow) {
  return {
    id: row.id,
    name: row.name,
    defaultDays: row.default_days,
    allowancePeriod: row.allowance_period,
    isActive: row.is_active,
    allowBackdate: row.allow_backdate,
    requiresDocumentAfterDays: row.requires_document_after_days,
  };
}

const LEAVE_TYPE_SELECT = `id, name, default_days,
       COALESCE(allowance_period, 'annual') AS allowance_period,
       COALESCE(is_active, true) AS is_active,
       allow_backdate,
       requires_document_after_days`;

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_INT
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function hasOwn(values: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(values, key);
}

function parseLeaveTypeBody(
  body: unknown,
  mode: "create" | "patch",
): { ok: true; value: LeaveTypeFields } | { ok: false; error: string } {
  const values = asObject(body);
  if (!values) {
    return { ok: false, error: "Invalid leave type" };
  }

  const fields: LeaveTypeFields = {};

  if (hasOwn(values, "name")) {
    const name = asNonEmptyString(values.name);
    if (!name) {
      return { ok: false, error: "Leave type name required" };
    }
    if (name.length > MAX_NAME_LEN) {
      return {
        ok: false,
        error: "Leave type name must be 80 characters or fewer",
      };
    }
    fields.name = name;
  }

  if (hasOwn(values, "defaultDays")) {
    if (!isNonNegativeInteger(values.defaultDays)) {
      return {
        ok: false,
        error: "Default days must be a non-negative integer",
      };
    }
    fields.defaultDays = values.defaultDays;
  }

  if (hasOwn(values, "isActive")) {
    if (typeof values.isActive !== "boolean") {
      return { ok: false, error: "Active flag must be a boolean" };
    }
    fields.isActive = values.isActive;
  }

  if (hasOwn(values, "allowBackdate")) {
    if (typeof values.allowBackdate !== "boolean") {
      return { ok: false, error: "Allow backdate must be a boolean" };
    }
    fields.allowBackdate = values.allowBackdate;
  }

  if (hasOwn(values, "requiresDocumentAfterDays")) {
    if (values.requiresDocumentAfterDays === null) {
      fields.requiresDocumentAfterDays = null;
    } else if (!isNonNegativeInteger(values.requiresDocumentAfterDays)) {
      return {
        ok: false,
        error: "Document-after days must be a non-negative integer or null",
      };
    } else {
      fields.requiresDocumentAfterDays = values.requiresDocumentAfterDays;
    }
  }

  if (mode === "create") {
    if (fields.name === undefined) {
      return { ok: false, error: "Leave type name required" };
    }
    if (fields.defaultDays === undefined) {
      return { ok: false, error: "Default days required" };
    }
    return { ok: true, value: fields };
  }

  if (
    fields.name === undefined &&
    fields.defaultDays === undefined &&
    fields.isActive === undefined &&
    fields.allowBackdate === undefined &&
    fields.requiresDocumentAfterDays === undefined
  ) {
    return { ok: false, error: "Provide at least one leave type field" };
  }

  return { ok: true, value: fields };
}

function isLeaveTypeNameConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23505"
  );
}

leaveTypesRouter.get(
  "/",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const result = await pool.query<LeaveTypeRow>(
      `SELECT ${LEAVE_TYPE_SELECT}
       FROM leave_types
       WHERE company_id = $1
         AND COALESCE(is_active, true) = true
       ORDER BY LOWER(name), id`,
      [companyId],
    );

    res.json({ leaveTypes: result.rows.map(toPublicLeaveType) });
  },
);

adminLeaveTypesRouter.get(
  "/",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const result = await pool.query<LeaveTypeRow>(
      `SELECT ${LEAVE_TYPE_SELECT}
       FROM leave_types
       WHERE company_id = $1
       ORDER BY LOWER(name), id`,
      [companyId],
    );

    res.json({ leaveTypes: result.rows.map(toPublicLeaveType) });
  },
);

adminLeaveTypesRouter.post(
  "/",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const parsed = parseLeaveTypeBody(req.body, "create");
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const name = parsed.value.name!;
    const defaultDays = parsed.value.defaultDays!;
    const isActive = parsed.value.isActive ?? true;
    const allowBackdate = parsed.value.allowBackdate ?? false;
    const requiresDocumentAfterDays =
      parsed.value.requiresDocumentAfterDays ?? null;

    try {
      const result = await pool.query<LeaveTypeRow>(
        `INSERT INTO leave_types (
           company_id, name, default_days, allowance_period, is_active,
           allow_backdate, requires_document_after_days
         )
         VALUES ($1, $2, $3, 'annual', $4, $5, $6)
         RETURNING ${LEAVE_TYPE_SELECT}`,
        [
          companyId,
          name,
          defaultDays,
          isActive,
          allowBackdate,
          requiresDocumentAfterDays,
        ],
      );
      res.status(201).json({ leaveType: toPublicLeaveType(result.rows[0]) });
    } catch (err) {
      if (isLeaveTypeNameConflict(err)) {
        res.status(409).json({
          error: "A leave type with this name already exists",
        });
        return;
      }
      throw err;
    }
  },
);

adminLeaveTypesRouter.patch(
  "/:id",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const id = Number(req.params.id);
    if (!isPositiveInteger(id)) {
      res.status(400).json({ error: "Invalid leave type id" });
      return;
    }

    const parsed = parseLeaveTypeBody(req.body, "patch");
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const assignments: string[] = [];
    const parameters: Array<string | number | boolean | null> = [id, companyId];
    const fields = parsed.value;

    if (fields.name !== undefined) {
      parameters.push(fields.name);
      assignments.push(`name = $${parameters.length}`);
    }
    if (fields.defaultDays !== undefined) {
      parameters.push(fields.defaultDays);
      assignments.push(`default_days = $${parameters.length}`);
    }
    if (fields.isActive !== undefined) {
      parameters.push(fields.isActive);
      assignments.push(`is_active = $${parameters.length}`);
    }
    if (fields.allowBackdate !== undefined) {
      parameters.push(fields.allowBackdate);
      assignments.push(`allow_backdate = $${parameters.length}`);
    }
    if (fields.requiresDocumentAfterDays !== undefined) {
      parameters.push(fields.requiresDocumentAfterDays);
      assignments.push(
        `requires_document_after_days = $${parameters.length}`,
      );
    }

    try {
      const updated = await pool.query<LeaveTypeRow>(
        `UPDATE leave_types
         SET ${assignments.join(", ")}
         WHERE id = $1 AND company_id = $2
         RETURNING ${LEAVE_TYPE_SELECT}`,
        parameters,
      );
      const row = updated.rows[0];
      if (!row) {
        res.status(404).json({ error: "Leave type not found" });
        return;
      }
      res.json({ leaveType: toPublicLeaveType(row) });
    } catch (err) {
      if (isLeaveTypeNameConflict(err)) {
        res.status(409).json({
          error: "A leave type with this name already exists",
        });
        return;
      }
      throw err;
    }
  },
);
