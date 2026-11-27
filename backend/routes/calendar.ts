import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ensureZaHolidaysForCompany } from "../leave/seedZaHolidays.js";
import { requireCompanyId } from "../tenancy.js";

export const calendarRouter = Router();

const MAX_RANGE_DAYS = 366;
const INVALID_RANGE = "from and to must be valid YYYY-MM-DD dates";

type HolidayMark = {
  date: string;
  label: string;
  name: string;
};

type LeaveMark = {
  id: number;
  personId: number;
  name: string;
  start: string;
  end: string;
  startHalf: string;
  endHalf: string;
  type: string | null;
  status: string;
};

type DateBlockMark = {
  id: number;
  start: string;
  end: string;
  startDate: string;
  endDate: string;
  departmentId: number | null;
  departmentName: string | null;
  mode: "block" | "warn";
  label: string;
  reason: string;
};

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

function inclusiveDayCount(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return (end - start) / (24 * 60 * 60 * 1000) + 1;
}

export function monthRange(value: unknown): { from: string; to: string } | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12) return null;
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lastDay =
    month === 2
      ? isLeapYear
        ? 29
        : 28
      : [4, 6, 9, 11].includes(month)
        ? 30
        : 31;
  return {
    from: `${value}-01`,
    to: `${value}-${String(lastDay).padStart(2, "0")}`,
  };
}

function isPositiveIntegerQuery(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    return null;
  }
  return Number(value);
}

export function toCalendarLeave(
  row: LeaveMark,
  role: "staff" | "manager" | "company_admin",
  viewerId: number,
): LeaveMark {
  return {
    ...row,
    type: role === "staff" && row.personId !== viewerId ? null : row.type,
  };
}

export function toCalendarLeaves(
  rows: LeaveMark[],
  role: "staff" | "manager" | "company_admin",
  viewerId: number,
): LeaveMark[] {
  return rows.map((row) => toCalendarLeave(row, role, viewerId));
}

calendarRouter.get(
  "/",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const range = req.query.month
      ? monthRange(req.query.month)
      : null;
    if (req.query.month && !range) {
      res.status(400).json({ error: "month must be a valid YYYY-MM month" });
      return;
    }
    const from = range?.from ?? parseDate(req.query.from);
    const to = range?.to ?? parseDate(req.query.to);
    if (!from || !to) {
      res.status(400).json({
        error: req.query.month ? "Invalid calendar month" : INVALID_RANGE,
      });
      return;
    }
    if (from > to) {
      res.status(400).json({ error: "from must be on or before to" });
      return;
    }
    if (inclusiveDayCount(from, to) > MAX_RANGE_DAYS) {
      res.status(400).json({
        error: `Date range must be ${MAX_RANGE_DAYS} days or fewer`,
      });
      return;
    }

    const actor = req.user!;
    const role = actor.role as "staff" | "manager" | "company_admin";
    await ensureZaHolidaysForCompany(companyId);
    const holidaysResult = await pool.query<HolidayMark>(
      `SELECT holiday_date::TEXT AS date, name AS label, name
       FROM public_holidays
       WHERE company_id = $1
         AND holiday_date BETWEEN $2::date AND $3::date
       ORDER BY holiday_date, id`,
      [companyId, from, to],
    );

    const requestedDepartmentId =
      req.query.departmentId === undefined
        ? null
        : isPositiveIntegerQuery(req.query.departmentId);
    if (req.query.departmentId !== undefined && requestedDepartmentId === null) {
      res.status(400).json({ error: "departmentId must be a positive integer" });
      return;
    }
    if (requestedDepartmentId !== null && role !== "company_admin") {
      res.status(403).json({ error: "Department filtering is not allowed" });
      return;
    }
    if (requestedDepartmentId !== null) {
      const department = await pool.query(
        `SELECT 1
         FROM departments
         WHERE id = $1 AND company_id = $2
         LIMIT 1`,
        [requestedDepartmentId, companyId],
      );
      if (department.rowCount === 0) {
        res.status(404).json({ error: "Department not found" });
        return;
      }
    }
    const actorDepartment = await pool.query<{ department_id: number | null }>(
      `SELECT department_id
       FROM users
       WHERE id = $1 AND company_id = $2
       LIMIT 1`,
      [actor.id, companyId],
    );
    const departmentId = actorDepartment.rows[0]?.department_id ?? null;
    const blocksResult = await pool.query<DateBlockMark>(
      `SELECT date_blocks.id,
              date_blocks.starts_on::TEXT AS start,
              date_blocks.ends_on::TEXT AS end,
              date_blocks.starts_on::TEXT AS "startDate",
              date_blocks.ends_on::TEXT AS "endDate",
              date_blocks.department_id AS "departmentId",
              departments.name AS "departmentName",
              date_blocks.mode,
              date_blocks.reason AS label,
              date_blocks.reason
       FROM date_blocks
       LEFT JOIN departments
         ON departments.id = date_blocks.department_id
        AND departments.company_id = date_blocks.company_id
       WHERE date_blocks.company_id = $1
         AND date_blocks.starts_on <= $3::date
         AND date_blocks.ends_on >= $2::date
         AND (
           $4 = 'company_admin'
           OR date_blocks.department_id IS NULL
           OR date_blocks.department_id = $5
         )
         AND ($6::INTEGER IS NULL OR date_blocks.department_id IS NULL
              OR date_blocks.department_id = $6)
       ORDER BY date_blocks.starts_on, date_blocks.id`,
      [companyId, from, to, role, departmentId, requestedDepartmentId],
    );

    const managerDepartmentFilter =
      role === "manager"
        ? `AND (
             employees.id = $4
             OR employees.department_id IN (
               SELECT departments.id
               FROM departments
               WHERE departments.company_id = $1
                 AND departments.manager_id = $4
             )
           )`
        : "";
    const companyDepartmentFilter =
      role === "company_admin" && requestedDepartmentId !== null
        ? "AND employees.department_id = $4"
        : "";
    const leaveParams =
      role === "manager"
        ? [companyId, from, to, actor.id]
        : role === "company_admin" && requestedDepartmentId !== null
          ? [companyId, from, to, requestedDepartmentId]
          : [companyId, from, to];
    const leaveResult = await pool.query<LeaveMark>(
      `SELECT
         leave_requests.id,
         leave_requests.employee_user_id AS "personId",
         COALESCE(
           NULLIF(BTRIM(employees.display_name), ''),
           'Colleague'
         ) AS name,
         GREATEST(leave_requests.start_date, $2::date)::TEXT AS start,
         LEAST(leave_requests.end_date, $3::date)::TEXT AS end,
         CASE
           WHEN leave_requests.start_date < $2::date THEN 'full'
           ELSE leave_requests.start_half
         END AS "startHalf",
         CASE
           WHEN leave_requests.end_date > $3::date THEN 'full'
           ELSE leave_requests.end_half
         END AS "endHalf",
         leave_types.name AS type,
         leave_requests.status
       FROM leave_requests
       JOIN users AS employees
         ON employees.id = leave_requests.employee_user_id
        AND employees.company_id = leave_requests.company_id
       JOIN leave_types
         ON leave_types.id = leave_requests.leave_type_id
        AND leave_types.company_id = leave_requests.company_id
       WHERE leave_requests.company_id = $1
         AND leave_requests.status IN ('pending', 'approved')
         AND leave_requests.start_date <= $3::date
         AND leave_requests.end_date >= $2::date
         ${managerDepartmentFilter}
         ${companyDepartmentFilter}
       ORDER BY leave_requests.start_date, leave_requests.id`,
      leaveParams,
    );

    res.json({
      holidays: holidaysResult.rows,
      leave: toCalendarLeaves(leaveResult.rows, role, actor.id),
      blocks: blocksResult.rows,
    });
  },
);
