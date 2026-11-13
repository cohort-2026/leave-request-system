import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer, { type MulterError } from "multer";
import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";
import {
  assertSupportingFile,
  asciiDownloadName,
  documentIsRequired,
  MAX_SUPPORTING_FILE_BYTES,
  UnsupportedSupportingFileError,
} from "../leave/supportingFile.js";
import {
  appOrigin,
  leaveCancelled,
  leaveDecision,
  leaveSubmitted,
  sendMail,
} from "../mail/index.js";
import type { AuthedUser } from "../middleware/auth.js";
import {
  applyApprovedLeaveToBalance,
  listBalances,
} from "../leave/balances.js";
import { todayInSast } from "../leave/todayInSast.js";
import {
  countWorkingDaysPreview,
  type DayHalf,
  type WorkingDayFlags,
} from "../leave/workingDays.js";
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
const uploadsDirectory =
  process.env.VERCEL === "1"
    ? resolve(tmpdir(), "leave-request-system", "uploads", "leave")
    : resolve(backendDirectory, "uploads", "leave");
const AUTO_APPROVE_REASON =
  "Automatically approved because no other eligible reviewer is available";
type Queryable = Pool | PoolClient;

const leaveUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SUPPORTING_FILE_BYTES,
    files: 1,
    fields: 12,
    fieldNameSize: 100,
    fieldSize: 10_000,
  },
  fileFilter: (_req, file, callback) => {
    try {
      file.mimetype = assertSupportingFile(file.originalname, file.mimetype);
      callback(null, true);
    } catch (error) {
      callback(error as Error);
    }
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
  return parsePositiveInteger(value.leaveTypeId ?? value.typeId ?? value.type);
}

function parseDayHalf(value: unknown): DayHalf | null {
  if (value === undefined || value === null || value === "") return "full";
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (key === "full") return "full";
  if (key === "am" || key === "morning") return "am";
  if (key === "pm" || key === "afternoon") return "pm";
  return null;
}

function dayHalfFromBody(body: unknown, edge: "start" | "end"): DayHalf | null {
  if (!isRecord(body)) return "full";
  const halfKey = edge === "start" ? "startHalf" : "endHalf";
  const partKey = edge === "start" ? "startPart" : "endPart";
  const raw = body[halfKey] ?? body[partKey];
  return parseDayHalf(raw);
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

  const holidaysResult = await executor.query<{ date: string; name: string }>(
    `SELECT holiday_date::date::TEXT AS date, name
     FROM public_holidays
     WHERE company_id = $1
       AND holiday_date BETWEEN $2::date AND $3::date
     ORDER BY holiday_date`,
    [companyId, startDate, endDate],
  );
  return {
    settings,
    holidays: holidaysResult.rows,
  };
}

function workingDaysBetween(
  startDate: string,
  endDate: string,
  settings: WorkingDayFlags,
  holidays: { date: string; name: string }[],
  startHalf: DayHalf = "full",
  endHalf: DayHalf = "full",
) {
  try {
    return countWorkingDaysPreview(
      settings,
      holidays.map((holiday) => holiday.date),
      startDate,
      endDate,
      startHalf,
      endHalf,
    );
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
  executor: Queryable,
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
    return {
      status: 413,
      message: "Supporting file must be 4 MB or smaller",
    };
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
    if (error instanceof UnsupportedSupportingFileError) {
      res.status(error.status).json({ error: error.message });
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

async function saveSupportingDocument(
  executor: Queryable,
  leaveRequestId: number,
  file: Express.Multer.File,
): Promise<void> {
  const mime = assertSupportingFile(file.originalname, file.mimetype);
  await executor.query(
    `DELETE FROM leave_documents WHERE leave_request_id = $1`,
    [leaveRequestId],
  );
  await executor.query(
    `INSERT INTO leave_documents (
       leave_request_id, filename, mime, size_bytes, file
     )
     VALUES ($1, $2, $3, $4, $5)`,
    [leaveRequestId, file.originalname, mime, file.size, file.buffer],
  );
}

async function deleteSupportingDocuments(
  executor: Queryable,
  leaveRequestId: number,
): Promise<void> {
  await executor.query(
    `DELETE FROM leave_documents WHERE leave_request_id = $1`,
    [leaveRequestId],
  );
}

async function loadSupportingDocument(
  executor: Queryable,
  leaveRequestId: number,
): Promise<{
  filename: string;
  mime: string;
  file: Buffer;
} | null> {
  const result = await executor.query<{
    filename: string;
    mime: string;
    file: Buffer;
  }>(
    `SELECT filename, mime, file
     FROM leave_documents
     WHERE leave_request_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [leaveRequestId],
  );
  return result.rows[0] ?? null;
}

async function hasStoredSupportingFile(
  executor: Queryable,
  leaveRequestId: number,
): Promise<boolean> {
  const result = await executor.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM leave_documents WHERE leave_request_id = $1
     ) AS exists`,
    [leaveRequestId],
  );
  return Boolean(result.rows[0]?.exists);
}

function canDownloadSupportingFile(
  actor: AuthedUser,
  row: QueueRequestRow,
): boolean {
  if (row.employee_user_id === actor.id) return true;
  if (actor.role === "company_admin") return true;
  if (actor.role === "manager") {
    return (
      row.assigned_user_ids.includes(actor.id) ||
      row.reviewer_user_id === actor.id
    );
  }
  return false;
}

leaveRouter.get(
  "/preview",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const leaveTypeId = parsePositiveInteger(
      req.query.leaveTypeId ?? req.query.typeId,
    );
    const startDate = parseDate(req.query.start);
    const endDate = parseDate(req.query.end);
    const startHalf = parseDayHalf(req.query.startHalf ?? req.query.startPart);
    const endHalf = parseDayHalf(req.query.endHalf ?? req.query.endPart);
    if (!leaveTypeId || !startDate || !endDate || !startHalf || !endHalf) {
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

    let calendar;
    let previewDays;
    try {
      calendar = await getCalendarForRange(
        companyId,
        startDate,
        endDate,
        pool,
      );
      previewDays = workingDaysBetween(
        startDate,
        endDate,
        calendar.settings,
        calendar.holidays,
        startHalf,
        endHalf,
      );
    } catch (error) {
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
    }
    const workingDaysCount = previewDays.workingDays;
    const excluded = calendar.holidays
      .filter((holiday) => previewDays.excluded.includes(holiday.date))
      .map((holiday) => holiday.date);
    const holidays = calendar.holidays.filter((holiday) =>
      previewDays.excluded.includes(holiday.date),
    );

    const today = todayInSast();
    const rulesResult = await pool.query<{ min_notice_days: number }>(
      `SELECT COALESCE(min_notice_days, 0) AS min_notice_days
       FROM company_leave_rules
       WHERE company_id = $1
       LIMIT 1`,
      [companyId],
    );
    const minNoticeDays = Number(rulesResult.rows[0]?.min_notice_days ?? 0);
    const warnings: string[] = [];
    if (!leaveType.allow_backdate && startDate < today) {
      warnings.push("This leave type does not allow backdated requests");
    }
    if (
      !leaveType.allow_backdate &&
      minNoticeDays > 0 &&
      wholeDaysBetween(today, startDate) < minNoticeDays
    ) {
      warnings.push(
        `This request must be submitted at least ${minNoticeDays} days in advance`,
      );
    }

    const balanceResult = await pool.query<{ days_remaining: number }>(
      `SELECT days_remaining
       FROM leave_balances
       WHERE company_id = $1
         AND user_id = $2
         AND leave_type_id = $3
       LIMIT 1`,
      [companyId, req.user!.id, leaveTypeId],
    );
    const remaining = balanceResult.rows[0]
      ? Number(balanceResult.rows[0].days_remaining)
      : null;
    const availableAfter =
      remaining === null ? null : remaining - workingDaysCount;
    if (remaining !== null && workingDaysCount > remaining) {
      warnings.push(
        `This request exceeds your remaining balance of ${remaining} days`,
      );
    }

    const documentRequired = documentIsRequired(
      leaveType.requires_document_after_days,
      workingDaysCount,
    );
    const documentRule =
      leaveType.requires_document_after_days === null
        ? "No supporting file is required for this type."
        : leaveType.requires_document_after_days === 0
          ? "A supporting file is required."
          : `A supporting file is required after ${leaveType.requires_document_after_days} working days.`;

    const reviewer = await findReviewer(
      companyId,
      req.user!.id,
      req.user!.role,
      pool,
    );
    const autoApprove = !reviewer && req.user!.role === "company_admin";
    const approverName = reviewer?.name ?? (autoApprove ? "Auto-approved" : null);

    res.json({
      workingDays: workingDaysCount,
      workingDaysCount,
      excluded,
      excludedDates: excluded,
      holidays: holidays.map((holiday) => ({
        date: holiday.date,
        label: holiday.name,
        name: holiday.name,
      })),
      availableAfter,
      documentRequired,
      documentRule,
      approver: approverName,
      approverName,
      reviewerName: reviewer?.name ?? null,
      warnings,
      noticeWarnings: warnings,
    });
  },
);

leaveRouter.post(
  "/",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  parseLeaveUpload,
  async (req, res) => {
    const uploadedFile = req.file;

    try {
      const companyId = requireCompanyId(req.user, res);
      if (companyId === null) return;

      const leaveTypeId = getLeaveTypeId(req.body);
      const startDate = parseDate(req.body?.start);
      const endDate = parseDate(req.body?.end);
      const startHalf = dayHalfFromBody(req.body, "start");
      const endHalf = dayHalfFromBody(req.body, "end");
      const reasonValue = req.body?.reason;
      const reason =
        typeof reasonValue === "string" ? reasonValue.trim() : null;

      if (!leaveTypeId || !startDate || !endDate || !startHalf || !endHalf) {
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

      const today = todayInSast();
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
          startHalf,
          endHalf,
        ).workingDays;

        if (
          documentIsRequired(
            leaveType.requires_document_after_days,
            workingDaysCount,
          ) &&
          !uploadedFile
        ) {
          throw new LeaveRequestError(
            `A supporting file is required for requests of more than ${leaveType.requires_document_after_days} working days`,
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
        const autoApprove =
          !reviewer && req.user!.role === "company_admin";
        if (!reviewer && !autoApprove) {
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
             start_half,
             end_half,
             working_days_count,
             reason,
             supporting_file_name,
             supporting_file_key,
             status,
             reviewer_user_id,
             reviewed_at,
             decision_reason
           )
           VALUES (
             $1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
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
            startHalf,
            endHalf,
            workingDaysCount,
            reason || null,
            uploadedFile?.originalname ?? null,
            uploadedFile ? "db" : null,
            autoApprove ? "approved" : "pending",
            reviewer?.id ?? null,
            autoApprove ? new Date() : null,
            autoApprove ? AUTO_APPROVE_REASON : null,
          ],
        );
        request = insertResult.rows[0];
        if (reviewer && !autoApprove) {
          await client.query(
            `INSERT INTO leave_request_assignees (
               leave_request_id, company_id, user_id, assignment_type
             )
             VALUES ($1, $2, $3, 'original')`,
            [request.id, companyId, reviewer.id],
          );
        }
        if (autoApprove) {
          const applied = await applyApprovedLeaveToBalance(
            req.user!.id,
            companyId,
            leaveTypeId,
            workingDaysCount,
            client,
          );
          if (!applied) {
            throw new LeaveRequestError(
              `This request exceeds your remaining balance of ${balance.days_remaining} days`,
            );
          }
        }
        if (uploadedFile) {
          await saveSupportingDocument(client, request.id, uploadedFile);
        }
        await client.query("COMMIT");
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
    }
  },
);

type MyLeaveRow = {
  id: number;
  company_id: number;
  employee_user_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  working_days_count: number;
  reason: string | null;
  supporting_file_name: string | null;
  supporting_file_key: string | null;
  status: string;
  submitted_at: Date;
  reviewer_user_id: number | null;
  assigned_user_ids: number[];
  decision_reason: string | null;
  employee_email: string;
  employee_name: string;
  leave_type: string;
  reviewer_email?: string | null;
  reviewer_name?: string | null;
};

const MY_LEAVE_SQL = `SELECT
       lr.id,
       lr.company_id,
       lr.employee_user_id,
       lr.leave_type_id,
       lr.start_date::TEXT AS start_date,
       lr.end_date::TEXT AS end_date,
       lr.working_days_count,
       lr.reason,
       lr.supporting_file_name,
       lr.supporting_file_key,
       lr.status,
       lr.submitted_at,
       lr.reviewer_user_id,
       lr.decision_reason,
       employee.email AS employee_email,
       COALESCE(employee.display_name, employee.email) AS employee_name,
       leave_types.name AS leave_type,
       reviewer.email AS reviewer_email,
       COALESCE(reviewer.display_name, reviewer.email) AS reviewer_name
     FROM leave_requests AS lr
     JOIN users AS employee
       ON employee.id = lr.employee_user_id
     JOIN leave_types
       ON leave_types.id = lr.leave_type_id
     LEFT JOIN users AS reviewer
       ON reviewer.id = lr.reviewer_user_id`;

function toMyLeaveItem(row: MyLeaveRow) {
  return {
    id: String(row.id),
    employeeName: row.employee_name,
    leaveTypeId: row.leave_type_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    workingDays: Number(row.working_days_count),
    reason: row.reason,
    supportingFileName: row.supporting_file_name,
    status: row.status,
    submittedAt: row.submitted_at,
    decisionReason: row.decision_reason,
  };
}

leaveRouter.get(
  "/",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const result = await pool.query<MyLeaveRow>(
      `${MY_LEAVE_SQL}
       WHERE lr.company_id = $1
         AND lr.employee_user_id = $2
       ORDER BY lr.submitted_at DESC, lr.id DESC`,
      [companyId, req.user!.id],
    );
    res.json(result.rows.map(toMyLeaveItem));
  },
);

leaveRouter.patch(
  "/:id",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  parseLeaveUpload,
  async (req, res) => {
    const uploadedFile = req.file;
    try {
      const companyId = requireCompanyId(req.user, res);
      if (companyId === null) return;

      const id = parsePositiveInteger(req.params.id);
      const leaveTypeId = getLeaveTypeId(req.body);
      const startDate = parseDate(req.body?.start);
      const endDate = parseDate(req.body?.end);
      const startHalf = dayHalfFromBody(req.body, "start");
      const endHalf = dayHalfFromBody(req.body, "end");
      const reasonValue = req.body?.reason;
      const reason =
        typeof reasonValue === "string" ? reasonValue.trim() : null;
      const removeFileValue = req.body?.removeFile;
      if (!id) {
        throw new LeaveRequestError("Invalid leave request id");
      }
      if (!leaveTypeId || !startDate || !endDate || !startHalf || !endHalf) {
        throw new LeaveRequestError(
          "Leave type, start date, and end date are required",
        );
      }
      if (endDate < startDate) {
        throw new LeaveRequestError(
          "End date must be on or after the start date",
        );
      }
      if (
        reasonValue !== undefined &&
        reasonValue !== null &&
        typeof reasonValue !== "string"
      ) {
        throw new LeaveRequestError("Reason must be text");
      }
      if (reason && reason.length > 5000) {
        throw new LeaveRequestError("Reason must be 5000 characters or fewer");
      }
      if (
        removeFileValue !== undefined &&
        removeFileValue !== "true" &&
        removeFileValue !== "false"
      ) {
        throw new LeaveRequestError("Invalid supporting file removal value");
      }

      const client = await pool.connect();
      let updated: MyLeaveRow;
      try {
        await client.query("BEGIN");
        const requestResult = await client.query<MyLeaveRow>(
          `${MY_LEAVE_SQL}
           WHERE lr.id = $1
           LIMIT 1
           FOR UPDATE OF lr`,
          [id],
        );
        const request = requestResult.rows[0];
        if (
          !request ||
          request.company_id !== companyId ||
          request.employee_user_id !== req.user!.id
        ) {
          throw new LeaveRequestError("Leave request not found", 404);
        }
        if (request.status !== "pending") {
          throw new LeaveRequestError("Only pending requests can be changed");
        }

        await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
          companyId,
          req.user!.id,
        ]);

        const leaveType = await getLeaveType(companyId, leaveTypeId, client);
        if (!leaveType) {
          throw new LeaveRequestError("Leave type not found", 404);
        }
        const today = todayInSast();
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
        const workingDaysCount = workingDaysBetween(
          startDate,
          endDate,
          calendar.settings,
          calendar.holidays,
          startHalf,
          endHalf,
        ).workingDays;
        const removeFile = removeFileValue === "true" && !uploadedFile;
        const storedFile =
          !removeFile &&
          (await hasStoredSupportingFile(client, request.id) ||
            Boolean(request.supporting_file_name));
        const hasSupportingFile = Boolean(uploadedFile || storedFile);
        if (
          documentIsRequired(
            leaveType.requires_document_after_days,
            workingDaysCount,
          ) &&
          !hasSupportingFile
        ) {
          throw new LeaveRequestError(
            `A supporting file is required for requests of more than ${leaveType.requires_document_after_days} working days`,
          );
        }

        const rulesResult = await client.query<{ min_notice_days: number }>(
          `SELECT COALESCE(min_notice_days, 0) AS min_notice_days
           FROM company_leave_rules
           WHERE company_id = $1
           LIMIT 1`,
          [companyId],
        );
        const minNoticeDays = Number(rulesResult.rows[0]?.min_notice_days ?? 0);
        if (
          !leaveType.allow_backdate &&
          minNoticeDays > 0 &&
          wholeDaysBetween(today, startDate) < minNoticeDays
        ) {
          throw new LeaveRequestError(
            `This request must be submitted at least ${minNoticeDays} days in advance`,
          );
        }

        const balanceResult = await client.query<{ days_remaining: number }>(
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
          throw new LeaveRequestError("No balance exists for this leave type");
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
            id,
          )
        ) {
          throw new LeaveRequestError(
            "These dates overlap an existing pending or approved leave request",
          );
        }

        const nextFileName =
          uploadedFile?.originalname ??
          (removeFile ? null : request.supporting_file_name);
        const nextFileKey = uploadedFile
          ? "db"
          : removeFile
            ? null
            : request.supporting_file_key;
        const updateResult = await client.query<MyLeaveRow>(
          `UPDATE leave_requests
           SET leave_type_id = $3,
               start_date = $4::date,
               end_date = $5::date,
               start_half = $6,
               end_half = $7,
               working_days_count = $8,
               reason = $9,
               supporting_file_name = $10,
               supporting_file_key = $11
           WHERE id = $1
             AND employee_user_id = $2
             AND status = 'pending'
           RETURNING id`,
          [
            id,
            req.user!.id,
            leaveTypeId,
            startDate,
            endDate,
            startHalf,
            endHalf,
            workingDaysCount,
            reason || null,
            nextFileName,
            nextFileKey,
          ],
        );
        if (updateResult.rowCount !== 1) {
          throw new LeaveRequestError("Only pending requests can be changed");
        }
        if (uploadedFile) {
          await saveSupportingDocument(client, id, uploadedFile);
        } else if (removeFile) {
          await deleteSupportingDocuments(client, id);
        }
        const updatedResult = await client.query<MyLeaveRow>(
          `${MY_LEAVE_SQL}
           WHERE lr.id = $1
           LIMIT 1`,
          [id],
        );
        const result = updatedResult.rows[0];
        if (!result) {
          throw new LeaveRequestError("Leave request not found", 404);
        }
        updated = result;
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      res.json(toMyLeaveItem(updated));
    } catch (error) {
      if (error instanceof LeaveRequestError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      throw error;
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
  assigned_user_ids: number[];
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
       ARRAY(
         SELECT assignee.user_id
         FROM leave_request_assignees AS assignee
         WHERE assignee.leave_request_id = lr.id
       ) AS assigned_user_ids,
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
      row.assigned_user_ids.includes(actor.id) ||
      (row.employee_role === "staff" &&
        row.department_manager_id === actor.id)
    );
  }
  return false;
}

function canDecide(actor: AuthedUser, row: QueueRequestRow): boolean {
  if (row.employee_user_id === actor.id) return false;
  if (actor.role === "company_admin") return true;
  if (actor.role === "manager") {
    return (
      row.assigned_user_ids.includes(actor.id) ||
      (row.employee_role === "staff" &&
        (row.reviewer_user_id === actor.id ||
          row.department_manager_id === actor.id))
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
    return;
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
             AND (
               (
                 employee.role = 'staff'
                 AND department.manager_id = $2
               )
               OR EXISTS (
                 SELECT 1
                 FROM leave_request_assignees AS assignee
                 WHERE assignee.leave_request_id = lr.id
                   AND assignee.user_id = $2
               )
             )
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
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const request = await loadQueueRequest(id);
    if (!request || request.company_id !== companyId) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    const isOwner = request.employee_user_id === req.user!.id;
    if (
      !isOwner &&
      !canSeeInQueue(req.user!, request) &&
      !canDecide(req.user!, request)
    ) {
      res.status(403).json({ error: "You are not allowed to do that" });
      return;
    }

    const detailResult = await pool.query<MyLeaveRow>(
      `${MY_LEAVE_SQL}
       WHERE lr.id = $1
       LIMIT 1`,
      [id],
    );
    const detail = detailResult.rows[0];
    if (!detail) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    res.json({ ...toQueueItem(request), ...toMyLeaveItem(detail) });
  },
);

leaveRouter.get(
  "/:id/file",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const request = await loadQueueRequest(id);
    if (!request || request.company_id !== companyId) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    if (!canDownloadSupportingFile(req.user!, request)) {
      res.status(403).json({ error: "You are not allowed to do that" });
      return;
    }

    const stored = await loadSupportingDocument(pool, id);
    let filename = stored?.filename;
    let mime = stored?.mime ?? "application/octet-stream";
    let body: Buffer | null = stored?.file ?? null;

    if (!body) {
      const detail = await pool.query<MyLeaveRow>(
        `${MY_LEAVE_SQL}
         WHERE lr.id = $1
         LIMIT 1`,
        [id],
      );
      const row = detail.rows[0];
      if (row?.supporting_file_key && row.supporting_file_key !== "db") {
        try {
          body = await readFile(
            resolve(uploadsDirectory, basename(row.supporting_file_key)),
          );
          filename = row.supporting_file_name ?? "supporting-file";
        } catch {
          body = null;
        }
      } else {
        filename = row?.supporting_file_name ?? filename;
      }
    }

    if (!body || !filename) {
      res.status(404).json({ error: "No supporting file on this request" });
      return;
    }

    await pool.query(
      `INSERT INTO leave_document_access (
         company_id, leave_request_id, user_id
       )
       VALUES ($1, $2, $3)`,
      [companyId, id, req.user!.id],
    );

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiDownloadName(filename)}"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.send(body);
  },
);

leaveRouter.get(
  "/:id/file/access",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const request = await loadQueueRequest(id);
    if (!request || request.company_id !== companyId) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }

    const result = await pool.query<{
      user_id: number;
      accessed_at: Date;
    }>(
      `SELECT user_id, accessed_at
       FROM leave_document_access
       WHERE company_id = $1
         AND leave_request_id = $2
       ORDER BY accessed_at DESC, id DESC`,
      [companyId, id],
    );
    res.json({
      access: result.rows.map((row) => ({
        userId: row.user_id,
        accessedAt: row.accessed_at,
      })),
    });
  },
);

leaveRouter.post(
  "/:id/cancel",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const client = await pool.connect();
    let cancelled: MyLeaveRow;
    try {
      await client.query("BEGIN");
      const result = await client.query<MyLeaveRow>(
        `${MY_LEAVE_SQL}
         WHERE lr.id = $1
         LIMIT 1
         FOR UPDATE OF lr`,
        [id],
      );
      const request = result.rows[0];
      if (
        !request ||
        request.company_id !== companyId ||
        request.employee_user_id !== req.user!.id
      ) {
        throw new LeaveRequestError("Leave request not found", 404);
      }
      if (request.status !== "pending") {
        throw new LeaveRequestError("Only pending requests can be cancelled");
      }

      const update = await client.query(
        `UPDATE leave_requests
         SET status = 'cancelled',
             cancelled_at = NOW()
         WHERE id = $1
           AND employee_user_id = $2
           AND status = 'pending'`,
        [id, req.user!.id],
      );
      if (update.rowCount !== 1) {
        throw new LeaveRequestError("Only pending requests can be cancelled");
      }

      const cancelledResult = await client.query<MyLeaveRow>(
        `${MY_LEAVE_SQL}
         WHERE lr.id = $1
         LIMIT 1`,
        [id],
      );
      const cancelledRow = cancelledResult.rows[0];
      if (!cancelledRow) {
        throw new LeaveRequestError("Leave request not found", 404);
      }
      cancelled = cancelledRow;
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

    if (cancelled.reviewer_email && cancelled.reviewer_name) {
      try {
        await sendMail({
          to: cancelled.reviewer_email,
          ...leaveCancelled({
            requestId: cancelled.id,
            reviewerName: cancelled.reviewer_name,
            requesterName: cancelled.employee_name,
            leaveTypeName: cancelled.leave_type,
            startDate: cancelled.start_date,
            endDate: cancelled.end_date,
            actionUrl: new URL(
              `/team/queue/${cancelled.id}`,
              appOrigin(),
            ).toString(),
          }),
        });
      } catch (error) {
        console.error("Reviewer cancellation notification failed", {
          requestId: cancelled.id,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.json(toMyLeaveItem(cancelled));
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
