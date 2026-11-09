import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
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
  date: string;
  label: string;
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

function leaveEmployeeFilter(role: "staff" | "manager" | "company_admin"): string {
  if (role === "staff") {
    return "AND leave_requests.employee_user_id = $4";
  }
  if (role === "manager") {
    return `AND (
         leave_requests.employee_user_id = $4
         OR leave_requests.employee_user_id IN (
           SELECT members.id
           FROM users AS members
           JOIN departments
             ON departments.id = members.department_id
            AND departments.company_id = members.company_id
           WHERE members.company_id = $1
             AND departments.manager_id = $4
         )
       )`;
  }
  return "";
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

    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (!from || !to) {
      res.status(400).json({ error: INVALID_RANGE });
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
    const holidaysResult = await pool.query<HolidayMark>(
      `SELECT holiday_date::TEXT AS date, name AS label, name
       FROM public_holidays
       WHERE company_id = $1
         AND holiday_date BETWEEN $2::date AND $3::date
       ORDER BY holiday_date, id`,
      [companyId, from, to],
    );

    const employeeFilter = leaveEmployeeFilter(role);
    const leaveParams =
      role === "company_admin"
        ? [companyId, from, to]
        : [companyId, from, to, actor.id];
    const leaveLabelSql =
      role === "staff"
        ? "leave_types.name"
        : "COALESCE(NULLIF(BTRIM(employees.display_name), ''), employees.email)";

    const leaveResult = await pool.query<LeaveMark>(
      `SELECT
         day.ts::date::TEXT AS date,
         ${leaveLabelSql} AS label
       FROM leave_requests
       JOIN users AS employees
         ON employees.id = leave_requests.employee_user_id
       JOIN leave_types
         ON leave_types.id = leave_requests.leave_type_id
       JOIN LATERAL generate_series(
         GREATEST(leave_requests.start_date, $2::date),
         LEAST(leave_requests.end_date, $3::date),
         INTERVAL '1 day'
       ) AS day(ts) ON true
       WHERE leave_requests.company_id = $1
         AND leave_requests.status IN ('pending', 'approved')
         AND leave_requests.start_date <= $3::date
         AND leave_requests.end_date >= $2::date
         ${employeeFilter}
       ORDER BY day.ts::date, leave_requests.id`,
      leaveParams,
    );

    res.json({
      holidays: holidaysResult.rows,
      leave: leaveResult.rows,
    });
  },
);
