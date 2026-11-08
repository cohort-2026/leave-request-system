import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer, { type MulterError } from "multer";
import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";
import {
  appOrigin,
  leaveDecision,
  leaveSubmitted,
  sendMail,
} from "../mail/index.js";
import type { AuthedUser } from "../middleware/auth.js";
import {
  applyApprovedLeaveToBalance,
  listBalances,
} from "../leave/balances.js";
import { countWorkingDays, type WorkingDayFlags } from "../leave/workingDays.js";
import { hasOverlappingLeaveRequest } from "../leave/overlap.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId, sameCompanyId } from "../tenancy.js";

export const leaveRouter = Router();
export const teamRouter = Router();
export const userBalancesRouter = Router();

const routesDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory =
  basename(dirname(routesDirectory)) === "dist"
    ? dirname(dirname(routesDirectory))
    : dirname(routesDirectory);
const uploadsDirectory = resolve(
  backendDirectory,
  "uploads",
  "leave",
);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
type Queryable = Pool | PoolClient;

const leaveUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdir(uploadsDirectory, { recursive: true })
        .then(() => callback(null, uploadsDirectory))
        .catch((error: unknown) =>
          callback(
            error instanceof Error
              ? error
              : new Error("Could not create leave upload directory"),
            uploadsDirectory,
          ),
        );
    },
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 4,
    fieldNameSize: 100,
    fieldSize: 10_000,
  },
});

type LeaveTypeRow = {
  id: number;
  company_id: number;
  name: string;
  is_active: boolean;
  allow_backdate: boolean;
  requires_document_after_days: number | null;
};

type CalendarRow = WorkingDayFlags;

type ReviewerRow = {
  staff_reviewer: "manager" | "company_admin";
  manager_reviewer: "company_admin";
  manager_id: number | null;
  manager_email: string | null;
  manager_name: string | null;
  admin_id: number | null;
  admin_email: string | null;
  admin_name: string | null;
};

type LeaveRequestRow = {
  id: number;
  status: string;
  start_date: string;
  end_date: string;
  working_days_count: number;
  submitted_at: Date;
};

class LeaveRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "LeaveRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDate(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) === 0
  ) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function getLeaveTypeId(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return parsePositiveInteger(value.leaveTypeId ?? value.type);
}

async function getLeaveType(
  companyId: number,
  leaveTypeId: number,
  executor: Queryable,
): Promise<LeaveTypeRow | null> {
  const result = await executor.query<LeaveTypeRow>(
    `SELECT
       id,
       company_id,
       name,
       COALESCE(is_active, true) AS is_active,
       allow_backdate,
       requires_document_after_days
     FROM leave_types
     WHERE id = $1
     LIMIT 1`,
    [leaveTypeId],
  );
  const leaveType = result.rows[0];
  if (!leaveType) return null;
  if (leaveType.company_id !== companyId) {
    throw new LeaveRequestError("Leave type belongs to another company", 403);
  }
  if (!leaveType.is_active) return null;
  return leaveType;
}

async function getCalendarForRange(
  companyId: number,
  startDate: string,
  endDate: string,
  executor: Queryable,
) {
  const companyResult = await executor.query<CalendarRow>(
    `SELECT
       monday_is_working AS "mondayIsWorking",
       tuesday_is_working AS "tuesdayIsWorking",
       wednesday_is_working AS "wednesdayIsWorking",
       thursday_is_working AS "thursdayIsWorking",
       friday_is_working AS "fridayIsWorking",
       saturday_is_working AS "saturdayIsWorking",
       sunday_is_working AS "sundayIsWorking"
     FROM companies
     WHERE id = $1
     LIMIT 1`,
    [companyId],
  );
  const settings = companyResult.rows[0];
  if (!settings) {
    throw new LeaveRequestError("Company calendar not found", 404);
  }

  const holidaysResult = await executor.query<{ date: string }>(
    `SELECT holiday_date::TEXT AS date
     FROM public_holidays
     WHERE company_id = $1
       AND holiday_date BETWEEN $2::date AND $3::date`,
    [companyId, startDate, endDate],
  );
  return {
    settings,
    holidays: holidaysResult.rows.map((row) => row.date),
  };
}

function workingDaysBetween(
  startDate: string,
  endDate: string,
  settings: WorkingDayFlags,
  holidays: string[],
): number {
  try {
    return countWorkingDays(settings, holidays, startDate, endDate);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new LeaveRequestError(error.message);
    }
    throw error;
  }
}

function wholeDaysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return (end - start) / (24 * 60 * 60 * 1000);
}

async function findReviewer(
  companyId: number,
  employeeId: number,
  employeeRole: string,
  executor: PoolClient,
): Promise<{ id: number; email: string; name: string } | null> {
  const result = await executor.query<ReviewerRow>(
    `SELECT
       COALESCE(rules.staff_reviewer, 'manager') AS staff_reviewer,
       COALESCE(rules.manager_reviewer, 'company_admin') AS manager_reviewer,
       CASE
         WHEN requester.role = 'staff'
          AND COALESCE(rules.staff_reviewer, 'manager') = 'manager'
          AND department_manager.id <> requester.id
         THEN department_manager.id
         ELSE NULL
       END AS manager_id,
       CASE
         WHEN requester.role = 'staff'
          AND COALESCE(rules.staff_reviewer, 'manager') = 'manager'
          AND department_manager.id <> requester.id
         THEN department_manager.email
         ELSE NULL
       END AS manager_email,
       CASE
         WHEN requester.role = 'staff'
          AND COALESCE(rules.staff_reviewer, 'manager') = 'manager'
          AND department_manager.id <> requester.id
         THEN COALESCE(department_manager.display_name, department_manager.email)
         ELSE NULL
       END AS manager_name,
       company_admin.id AS admin_id,
       company_admin.email AS admin_email,
       COALESCE(company_admin.display_name, company_admin.email) AS admin_name
     FROM users AS requester
     LEFT JOIN company_leave_rules AS rules
       ON rules.company_id = requester.company_id
     LEFT JOIN departments AS department
       ON department.id = requester.department_id
      AND department.company_id = requester.company_id
     LEFT JOIN users AS department_manager
       ON department_manager.id = department.manager_id
      AND department_manager.company_id = requester.company_id
      AND department_manager.status = 'active'
     LEFT JOIN LATERAL (
       SELECT id, email, display_name
       FROM users
       WHERE company_id = requester.company_id
         AND role = 'company_admin'
         AND status = 'active'
         AND id <> requester.id
       ORDER BY id
       LIMIT 1
     ) AS company_admin ON true
     WHERE requester.id = $1
       AND requester.company_id = $2
       AND requester.role = $3
     LIMIT 1`,
    [employeeId, companyId, employeeRole],
  );
  const row = result.rows[0];
  if (!row) return null;

  if (employeeRole === "staff" && row.staff_reviewer === "manager") {
    if (row.manager_id && row.manager_email && row.manager_name) {
      return {
        id: row.manager_id,
        email: row.manager_email,
        name: row.manager_name,
      };
    }
  }

  if (row.admin_id && row.admin_email && row.admin_name) {
    return {
      id: row.admin_id,
      email: row.admin_email,
      name: row.admin_name,
    };
  }
  return null;
}

function getUploadErrorMessage(error: MulterError): {
  status: number;
  message: string;
} {
  if (error.code === "LIMIT_FILE_SIZE") {
    return { status: 413, message: "Supporting file must be 10 MB or smaller" };
  }
  return { status: 400, message: "Invalid supporting file upload" };
}

function parseLeaveUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  leaveUpload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const result = getUploadErrorMessage(error);
      res.status(result.status).json({ error: result.message });
      return;
    }
    next(error);
  });
}

leaveRouter.get(
  "/preview",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const leaveTypeId = parsePositiveInteger(req.query.leaveTypeId);
    const startDate = parseDate(req.query.start);
    const endDate = parseDate(req.query.end);
    if (!leaveTypeId || !startDate || !endDate) {
      res.status(400).json({
        error: "Leave type, start date, and end date are required",
      });
      return;
    }
    if (endDate < startDate) {
      res.status(400).json({ error: "End date must be on or after start date" });
      return;
    }

    let leaveType: LeaveTypeRow | null;
    try {
      leaveType = await getLeaveType(companyId, leaveTypeId, pool);
    } catch (error) {
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
    if (!leaveType) {
      res.status(404).json({ error: "Leave type not found" });
      return;
    }

    const calendar = await getCalendarForRange(
      companyId,
      startDate,
      endDate,
      pool,
    );
    const workingDaysCount = workingDaysBetween(
      startDate,
      endDate,
      calendar.settings,
      calendar.holidays,
    );
    res.json({ workingDaysCount });
  },
);

leaveRouter.post(
  "/",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  parseLeaveUpload,
  async (req, res) => {
    const uploadedFile = req.file;
    let keepUploadedFile = false;

    try {
      const companyId = requireCompanyId(req.user, res);
      if (companyId === null) return;

      const leaveTypeId = getLeaveTypeId(req.body);
      const startDate = parseDate(req.body?.start);
      const endDate = parseDate(req.body?.end);
      const reasonValue = req.body?.reason;
      const reason =
        typeof reasonValue === "string" ? reasonValue.trim() : null;

      if (!leaveTypeId || !startDate || !endDate) {
        throw new LeaveRequestError(
          "Leave type, start date, and end date are required",
        );
      }
      if (endDate < startDate) {
        throw new LeaveRequestError(
          "End date must be on or after start date",
        );
      }
      if (
        reasonValue !== undefined &&
        reasonValue !== null &&
        reasonValue !== "" &&
        typeof reasonValue !== "string"
      ) {
        throw new LeaveRequestError("Reason must be text");
      }
      if (reason && reason.length > 5000) {
        throw new LeaveRequestError("Reason must be 5000 characters or fewer");
      }

      const today = new Date().toISOString().slice(0, 10);
      const client = await pool.connect();
      let request: LeaveRequestRow;
      let leaveTypeName: string;
      let workingDaysCount: number;
      let reviewer: { id: number; email: string; name: string } | null =
        null;

      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
          companyId,
          req.user!.id,
        ]);

        const leaveType = await getLeaveType(companyId, leaveTypeId, client);
        if (!leaveType) {
          throw new LeaveRequestError("Leave type not found", 404);
        }
        leaveTypeName = leaveType.name;

        if (!leaveType.allow_backdate && startDate < today) {
          throw new LeaveRequestError(
            "This leave type does not allow backdated requests",
          );
        }

        const calendar = await getCalendarForRange(
          companyId,
          startDate,
          endDate,
          client,
        );
        workingDaysCount = workingDaysBetween(
          startDate,
          endDate,
          calendar.settings,
          calendar.holidays,
        );

        if (
          leaveType.requires_document_after_days !== null &&
          workingDaysCount >= leaveType.requires_document_after_days &&
          !uploadedFile
        ) {
          throw new LeaveRequestError(
            `A supporting file is required for requests of ${leaveType.requires_document_after_days} or more working days`,
          );
        }

        const rulesResult = await client.query<{ min_notice_days: number }>(
          `SELECT COALESCE(min_notice_days, 0) AS min_notice_days
           FROM company_leave_rules
           WHERE company_id = $1
           LIMIT 1`,
          [companyId],
        );
        const minNoticeDays = Number(
          rulesResult.rows[0]?.min_notice_days ?? 0,
        );
        if (
          !leaveType.allow_backdate &&
          minNoticeDays > 0 &&
          wholeDaysBetween(today, startDate) < minNoticeDays
        ) {
          throw new LeaveRequestError(
            `This request must be submitted at least ${minNoticeDays} days in advance`,
          );
        }

        const balanceResult = await client.query<{
          days_remaining: number;
        }>(
          `SELECT days_remaining
           FROM leave_balances
           WHERE company_id = $1
             AND user_id = $2
             AND leave_type_id = $3
           LIMIT 1`,
          [companyId, req.user!.id, leaveTypeId],
        );
        const balance = balanceResult.rows[0];
        if (!balance) {
          throw new LeaveRequestError(
            "No balance exists for this leave type",
            400,
          );
        }
        if (workingDaysCount > Number(balance.days_remaining)) {
          throw new LeaveRequestError(
            `This request exceeds your remaining balance of ${balance.days_remaining} days`,
          );
        }

        if (
          await hasOverlappingLeaveRequest(
            client,
            companyId,
            req.user!.id,
            startDate,
            endDate,
          )
        ) {
          throw new LeaveRequestError(
            "These dates overlap an existing pending or approved leave request",
          );
        }

        reviewer = await findReviewer(
          companyId,
          req.user!.id,
          req.user!.role,
          client,
        );
        if (!reviewer) {
          throw new LeaveRequestError(
            "No eligible reviewer is available for this request",
            409,
          );
        }

        const insertResult = await client.query<LeaveRequestRow>(
          `INSERT INTO leave_requests (
             company_id,
             employee_user_id,
             leave_type_id,
             start_date,
             end_date,
             working_days_count,
             reason,
             supporting_file_name,
             supporting_file_key,
             status,
             reviewer_user_id
           )
           VALUES (
             $1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, 'pending', $10
           )
           RETURNING
             id,
             status,
             start_date::TEXT AS start_date,
             end_date::TEXT AS end_date,
             working_days_count,
             submitted_at`,
          [
            companyId,
            req.user!.id,
            leaveTypeId,
            startDate,
            endDate,
            workingDaysCount,
            reason || null,
            uploadedFile?.originalname ?? null,
            uploadedFile ? basename(uploadedFile.filename) : null,
            reviewer.id,
          ],
        );
        request = insertResult.rows[0];
        await client.query("COMMIT");
        keepUploadedFile = Boolean(uploadedFile);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      if (reviewer) {
        try {
          await sendMail({
            to: reviewer.email,
            ...leaveSubmitted({
              requestId: request.id,
              reviewerName: reviewer.name,
              requesterName: req.user!.display_name ?? req.user!.email,
              leaveTypeName,
              startDate: request.start_date,
              endDate: request.end_date,
              workingDaysCount,
              actionUrl: new URL(
                `/team/queue/${request.id}`,
                appOrigin(),
              ).toString(),
            }),
          });
        } catch (error) {
          console.error("Reviewer notification failed for leave request", {
            requestId: request.id,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          res.status(502).json({
            error:
              "Leave request was saved, but the reviewer could not be notified",
            leaveRequestId: request.id,
          });
          return;
        }
      }

      res.status(201).json({
        leaveRequest: {
          id: request.id,
          status: request.status,
          startDate: request.start_date,
          endDate: request.end_date,
          workingDaysCount: request.working_days_count,
          submittedAt: request.submitted_at,
        },
      });
    } catch (error) {
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    } finally {
      if (uploadedFile && !keepUploadedFile) {
        await rm(uploadedFile.path, { force: true });
      }
    }
  },
);

leaveRouter.get(
  "/balances",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const balances = await listBalances(req.user!.id, companyId);
    res.json({ balances });
  },
);

userBalancesRouter.get(
  "/:id/balances",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    const found = await pool.query<{
      id: number;
      company_id: number | null;
    }>(
      `SELECT id, company_id
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    const target = found.rows[0];
    if (!target) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const actor = req.user!;
    const isSelf = actor.id === target.id;
    const isSameCompanyManager =
      (actor.role === "manager" || actor.role === "company_admin") &&
      sameCompanyId(companyId, target.company_id);
    if (!isSelf && !isSameCompanyManager) {
      res.status(403).json({ error: "You are not allowed to do that" });
      return;
    }

    const balances = await listBalances(target.id, companyId);
    res.json({ balances });
  },
);

type QueueRequestRow = {
  id: number;
  company_id: number;
  employee_user_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  working_days_count: number;
  status: string;
  reviewer_user_id: number | null;
  employee_email: string;
  employee_name: string;
  employee_role: string;
  leave_type: string;
  department_manager_id: number | null;
};

const QUEUE_REQUEST_SQL = `SELECT
       lr.id,
       lr.company_id,
       lr.employee_user_id,
       lr.leave_type_id,
       lr.start_date::TEXT AS start_date,
       lr.end_date::TEXT AS end_date,
       lr.working_days_count,
       lr.status,
       lr.reviewer_user_id,
       employee.email AS employee_email,
       COALESCE(employee.display_name, employee.email) AS employee_name,
       employee.role AS employee_role,
       leave_types.name AS leave_type,
       department.manager_id AS department_manager_id
     FROM leave_requests AS lr
     JOIN users AS employee
       ON employee.id = lr.employee_user_id
     JOIN leave_types
       ON leave_types.id = lr.leave_type_id
     LEFT JOIN departments AS department
       ON department.id = employee.department_id
      AND department.company_id = lr.company_id`;

function toQueueItem(row: QueueRequestRow) {
  return {
    id: String(row.id),
    employeeName: row.employee_name,
    startDate: row.start_date,
    endDate: row.end_date,
    workingDays: Number(row.working_days_count),
    leaveType: row.leave_type,
    status: row.status,
  };
}

function canSeeInQueue(actor: AuthedUser, row: QueueRequestRow): boolean {
  if (row.employee_user_id === actor.id) return false;
  if (actor.role === "company_admin") return true;
  if (actor.role === "manager") {
    return (
      row.employee_role === "staff" &&
      row.department_manager_id === actor.id
    );
  }
  return false;
}

function canDecide(actor: AuthedUser, row: QueueRequestRow): boolean {
  if (row.employee_user_id === actor.id) return false;
  if (actor.role === "company_admin") return true;
  if (actor.role === "manager") {
    return (
      row.employee_role === "staff" &&
      (row.reviewer_user_id === actor.id ||
        row.department_manager_id === actor.id)
    );
  }
  return false;
}

async function loadQueueRequest(
  id: number,
  executor: Queryable = pool,
  lock = false,
): Promise<QueueRequestRow | null> {
  const result = await executor.query<QueueRequestRow>(
    `${QUEUE_REQUEST_SQL}
     WHERE lr.id = $1
     LIMIT 1${lock ? " FOR UPDATE OF lr" : ""}`,
    [id],
  );
  return result.rows[0] ?? null;
}

async function notifyRequester(row: QueueRequestRow, status: "approved" | "rejected", decisionReason: string | null) {
  try {
    await sendMail({
      to: row.employee_email,
      ...leaveDecision({
        requestId: row.id,
        requesterName: row.employee_name,
        status,
        leaveTypeName: row.leave_type,
        startDate: row.start_date,
        endDate: row.end_date,
        workingDaysCount: Number(row.working_days_count),
        decisionReason,
        actionUrl: new URL(`/leave/${row.id}`, appOrigin()).toString(),
      }),
    });
  } catch (error) {
    console.error("Requester notification failed for leave request", {
      requestId: row.id,
      status,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw new LeaveRequestError(
      "Decision was saved, but the requester could not be notified",
      502,
    );
  }
}

teamRouter.get(
  "/queue",
  requireAuth,
  requireRole("manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const actor = req.user!;
    const result = await pool.query<QueueRequestRow>(
      `${QUEUE_REQUEST_SQL}
       WHERE lr.company_id = $1
         AND lr.status = 'pending'
         AND lr.employee_user_id <> $2
         AND (
           $3 = 'company_admin'
           OR (
             $3 = 'manager'
             AND employee.role = 'staff'
             AND department.manager_id = $2
           )
         )
       ORDER BY lr.submitted_at, lr.id`,
      [companyId, actor.id, actor.role],
    );
    res.json(result.rows.map(toQueueItem));
  },
);

leaveRouter.get(
  "/:id",
  requireAuth,
  requireRole("manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const request = await loadQueueRequest(id);
    if (!request) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    if (request.company_id !== companyId || !canSeeInQueue(req.user!, request)) {
      res.status(403).json({ error: "You are not allowed to do that" });
      return;
    }

    res.json(toQueueItem(request));
  },
);

leaveRouter.post(
  "/:id/approve",
  requireAuth,
  requireRole("manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const client = await pool.connect();
    let decided: QueueRequestRow;
    try {
      await client.query("BEGIN");
      const request = await loadQueueRequest(id, client, true);
      if (!request) {
        throw new LeaveRequestError("Leave request not found", 404);
      }
      if (request.company_id !== companyId || request.employee_user_id === req.user!.id) {
        throw new LeaveRequestError("You are not allowed to do that", 403);
      }
      if (!canDecide(req.user!, request)) {
        throw new LeaveRequestError("You are not allowed to do that", 403);
      }
      if (request.status !== "pending") {
        throw new LeaveRequestError("Only pending requests can be approved");
      }

      await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
        companyId,
        request.employee_user_id,
      ]);

      const applied = await applyApprovedLeaveToBalance(
        request.employee_user_id,
        companyId,
        request.leave_type_id,
        Number(request.working_days_count),
        client,
      );
      if (!applied) {
        throw new LeaveRequestError(
          "Remaining balance is no longer enough for this request",
        );
      }

      const update = await client.query(
        `UPDATE leave_requests
         SET status = 'approved',
             reviewer_user_id = $2,
             reviewed_at = NOW(),
             decision_reason = NULL
         WHERE id = $1
           AND status = 'pending'`,
        [request.id, req.user!.id],
      );
      if (update.rowCount !== 1) {
        throw new LeaveRequestError("Only pending requests can be approved");
      }

      const updated = await loadQueueRequest(request.id, client);
      if (!updated) {
        throw new LeaveRequestError("Leave request not found", 404);
      }
      decided = updated;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    } finally {
      client.release();
    }

    try {
      await notifyRequester(decided, "approved", null);
    } catch (error) {
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({
          error: error.message,
          leaveRequestId: decided.id,
        });
        return;
      }
      throw error;
    }

    res.json(toQueueItem(decided));
  },
);

leaveRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole("manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const reasonValue = isRecord(req.body) ? req.body.decisionReason : undefined;
    const decisionReason =
      typeof reasonValue === "string" ? reasonValue.trim() : "";
    if (!decisionReason) {
      res.status(400).json({ error: "A rejection reason is required" });
      return;
    }

    const client = await pool.connect();
    let decided: QueueRequestRow;
    try {
      await client.query("BEGIN");
      const request = await loadQueueRequest(id, client, true);
      if (!request) {
        throw new LeaveRequestError("Leave request not found", 404);
      }
      if (request.company_id !== companyId || request.employee_user_id === req.user!.id) {
        throw new LeaveRequestError("You are not allowed to do that", 403);
      }
      if (!canDecide(req.user!, request)) {
        throw new LeaveRequestError("You are not allowed to do that", 403);
      }
      if (request.status !== "pending") {
        throw new LeaveRequestError("Only pending requests can be rejected");
      }

      const update = await client.query(
        `UPDATE leave_requests
         SET status = 'rejected',
             reviewer_user_id = $2,
             reviewed_at = NOW(),
             decision_reason = $3
         WHERE id = $1
           AND status = 'pending'`,
        [request.id, req.user!.id, decisionReason],
      );
      if (update.rowCount !== 1) {
        throw new LeaveRequestError("Only pending requests can be rejected");
      }

      const updated = await loadQueueRequest(request.id, client);
      if (!updated) {
        throw new LeaveRequestError("Leave request not found", 404);
      }
      decided = updated;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    } finally {
      client.release();
    }

    try {
      await notifyRequester(decided, "rejected", decisionReason);
    } catch (error) {
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({
          error: error.message,
          leaveRequestId: decided.id,
        });
        return;
      }
      throw error;
    }

    res.json(toQueueItem(decided));
  },
);
