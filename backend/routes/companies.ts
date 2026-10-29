import { Router } from "express";
import bcrypt from "bcrypt";
import {
  completePaidSignup,
  createSignupCheckout,
  isCompaniesTableMissing,
  isEmailTaken,
  mockPayAllowed,
} from "../companies/signup.js";
import { pool } from "../db.js";
import type { WorkingDayFlags } from "../leave/workingDays.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  disableOnboardingLink,
  getActiveOnboardingLink,
  isOnboardingTableMissing,
  rotateOnboardingLink,
} from "../onboarding/index.js";
import { toPublicUser, type UserRow } from "../session.js";
import { NOT_IN_COMPANY, requireCompanyId } from "../tenancy.js";
import {
  issueVerificationToken,
  sendVerificationEmail,
} from "../verification/index.js";

export const companiesRouter = Router();

const INVITES_UNAVAILABLE = "Invite links are not available yet.";
const SIGNUP_UNAVAILABLE = "Company signup is not available yet.";
const MOCK_PAY_DISABLED =
  "Live payment is not configured yet. Development mock pay is local only.";
const CHECKOUT_BAD = "This payment checkout is invalid or has expired.";
const CHECKOUT_USED = "This payment checkout was already completed.";
const MAX_DISPLAY_NAME_LEN = 120;
const MAX_COMPANY_NAME_LEN = 80;
const MIN_COMPANY_NAME_LEN = 2;
const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 1024;
const MIN_PASSWORD_LEN = 8;
const MAX_HOLIDAY_NAME_LEN = 120;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WORKING_DAY_FIELDS = [
  "mondayIsWorking",
  "tuesdayIsWorking",
  "wednesdayIsWorking",
  "thursdayIsWorking",
  "fridayIsWorking",
  "saturdayIsWorking",
  "sundayIsWorking",
] as const;

type WorkingDaySettings = WorkingDayFlags;

type CalendarSettingsRow = WorkingDaySettings;

type HolidayRow = {
  id: number;
  date: string;
  name: string;
};

function isWorkingDaySettings(value: unknown): value is WorkingDaySettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const settings = value as Record<string, unknown>;
  return WORKING_DAY_FIELDS.every(
    (field) => typeof settings[field] === "boolean",
  );
}

function isCalendarDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) === 0
  ) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23505"
  );
}

async function readCompanyCalendar(
  companyId: number,
): Promise<(CalendarSettingsRow & { holidays: HolidayRow[] }) | null> {
  const settingsResult = await pool.query<CalendarSettingsRow>(
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
  const settings = settingsResult.rows[0];
  if (!settings) {
    return null;
  }

  const holidaysResult = await pool.query<HolidayRow>(
    `SELECT id, holiday_date::TEXT AS date, name
     FROM public_holidays
     WHERE company_id = $1
     ORDER BY holiday_date, id`,
    [companyId],
  );
  return { ...settings, holidays: holidaysResult.rows };
}

function sendInviteUnavailable(
  err: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): boolean {
  if (!isOnboardingTableMissing(err)) {
    return false;
  }
  res.status(503).json({ error: INVITES_UNAVAILABLE });
  return true;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

companiesRouter.post("/signup", async (req, res) => {
  const companyName = asNonEmptyString(req.body?.companyName);
  const rawDisplayName = req.body?.displayName;
  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;
  const planCode = asNonEmptyString(req.body?.planCode) ?? "starter";

  if (!companyName) {
    res.status(400).json({ error: "Company name required" });
    return;
  }
  if (
    companyName.length < MIN_COMPANY_NAME_LEN ||
    companyName.length > MAX_COMPANY_NAME_LEN
  ) {
    res.status(400).json({ error: "Company name must be 2 to 80 characters" });
    return;
  }

  if (typeof rawDisplayName !== "string") {
    res.status(400).json({ error: "Display name required" });
    return;
  }
  const displayName = rawDisplayName.trim();
  if (!displayName) {
    res.status(400).json({ error: "Display name required" });
    return;
  }
  if (displayName.length > MAX_DISPLAY_NAME_LEN) {
    res.status(400).json({ error: "Display name is too long" });
    return;
  }

  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const email = rawEmail.trim();
  const password = rawPassword;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  if (email.length > MAX_EMAIL_LEN || password.length > MAX_PASSWORD_LEN) {
    res.status(400).json({ error: "Email or password too long" });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }
  if (password.length < MIN_PASSWORD_LEN) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const created = await createSignupCheckout({
      companyName,
      email: email.toLowerCase(),
      passwordHash: hash,
      displayName,
      planCode,
    });
    if (created === "bad_plan") {
      res.status(400).json({ error: "Unknown plan" });
      return;
    }
    if (created === "email_taken") {
      res.status(409).json({ error: "Email already used" });
      return;
    }

    res.status(201).json(created);
  } catch (err: unknown) {
    if (isCompaniesTableMissing(err)) {
      res.status(503).json({ error: SIGNUP_UNAVAILABLE });
      return;
    }
    if (isEmailTaken(err)) {
      res.status(409).json({ error: "Email already used" });
      return;
    }
    throw err;
  }
});

companiesRouter.post("/signup/mock-pay", async (req, res) => {
  if (!mockPayAllowed()) {
    res.status(503).json({ error: MOCK_PAY_DISABLED });
    return;
  }

  const token = asNonEmptyString(req.body?.token);
  if (!token) {
    res.status(400).json({ error: CHECKOUT_BAD });
    return;
  }

  try {
    const created = await completePaidSignup(token);
    if (created === "invalid" || created === "expired") {
      res.status(400).json({ error: CHECKOUT_BAD });
      return;
    }
    if (created === "used") {
      res.status(400).json({ error: CHECKOUT_USED });
      return;
    }
    if (created === "email_taken") {
      res.status(409).json({ error: "Email already used" });
      return;
    }

    const verifyToken = await issueVerificationToken(created.user.id);
    try {
      await sendVerificationEmail(created.user.email, verifyToken);
    } catch {
      res.status(500).json({ error: "Could not send verification email" });
      return;
    }

    res.status(201).json({
      ...toPublicUser(created.user),
      company: created.company,
      subscription: created.subscription,
      invoice: created.invoice,
    });
  } catch (err: unknown) {
    if (isCompaniesTableMissing(err)) {
      res.status(503).json({ error: SIGNUP_UNAVAILABLE });
      return;
    }
    if (isEmailTaken(err)) {
      res.status(409).json({ error: "Email already used" });
      return;
    }
    throw err;
  }
});

companiesRouter.get("/current", requireAuth, async (req, res) => {
  const companyId = requireCompanyId(req.user, res);
  if (companyId === null) {
    return;
  }

  const result = await pool.query<{
    id: number;
    name: string;
    slug: string;
    status: string;
    trial_ends_at: Date | null;
  }>(
    `SELECT id, name, slug, status, trial_ends_at
     FROM companies
     WHERE id = $1
     LIMIT 1`,
    [companyId],
  );
  const row = result.rows[0];
  if (!row) {
    res.status(403).json({ error: NOT_IN_COMPANY });
    return;
  }

  res.json({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    trialEndsAt: row.trial_ends_at ? row.trial_ends_at.toISOString() : null,
  });
});

companiesRouter.get(
  "/current/calendar",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const calendar = await readCompanyCalendar(companyId);
    if (!calendar) {
      res.status(403).json({ error: NOT_IN_COMPANY });
      return;
    }

    res.json(calendar);
  },
);

companiesRouter.patch(
  "/current/calendar",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }
    if (!isWorkingDaySettings(req.body)) {
      res.status(400).json({
        error: "All seven working-day settings must be booleans",
      });
      return;
    }

    const result = await pool.query<CalendarSettingsRow>(
      `UPDATE companies
       SET
         monday_is_working = $1,
         tuesday_is_working = $2,
         wednesday_is_working = $3,
         thursday_is_working = $4,
         friday_is_working = $5,
         saturday_is_working = $6,
         sunday_is_working = $7
       WHERE id = $8
       RETURNING
         monday_is_working AS "mondayIsWorking",
         tuesday_is_working AS "tuesdayIsWorking",
         wednesday_is_working AS "wednesdayIsWorking",
         thursday_is_working AS "thursdayIsWorking",
         friday_is_working AS "fridayIsWorking",
         saturday_is_working AS "saturdayIsWorking",
         sunday_is_working AS "sundayIsWorking"`,
      [
        req.body.mondayIsWorking,
        req.body.tuesdayIsWorking,
        req.body.wednesdayIsWorking,
        req.body.thursdayIsWorking,
        req.body.fridayIsWorking,
        req.body.saturdayIsWorking,
        req.body.sundayIsWorking,
        companyId,
      ],
    );
    if (!result.rows[0]) {
      res.status(403).json({ error: NOT_IN_COMPANY });
      return;
    }

    const calendar = await readCompanyCalendar(companyId);
    if (!calendar) {
      res.status(403).json({ error: NOT_IN_COMPANY });
      return;
    }

    res.json(calendar);
  },
);

companiesRouter.post(
  "/current/holidays",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const date = req.body?.date;
    const name = asNonEmptyString(req.body?.name);
    if (!isCalendarDate(date)) {
      res.status(400).json({ error: "Date must be a valid YYYY-MM-DD date" });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "Holiday name required" });
      return;
    }
    if (name.length > MAX_HOLIDAY_NAME_LEN) {
      res
        .status(400)
        .json({ error: "Holiday name must be 120 characters or fewer" });
      return;
    }

    try {
      const result = await pool.query<HolidayRow>(
        `INSERT INTO public_holidays (company_id, holiday_date, name)
         VALUES ($1, $2, $3)
         RETURNING id, holiday_date::TEXT AS date, name`,
        [companyId, date, name],
      );
      res.status(201).json({ holiday: result.rows[0] });
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({
          error: "A holiday already exists for that date",
        });
        return;
      }
      throw err;
    }
  },
);

companiesRouter.delete(
  "/current/holidays/:id",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid holiday id" });
      return;
    }

    const result = await pool.query(
      `DELETE FROM public_holidays
       WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Holiday not found" });
      return;
    }

    res.json({ ok: true });
  },
);

companiesRouter.get(
  "/current/users",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const result = await pool.query<
      Pick<
        UserRow,
        | "id"
        | "email"
        | "role"
        | "display_name"
        | "status"
        | "company_name"
        | "company_id"
      >
    >(
      `SELECT id, email, role, display_name, status, company_name, company_id
       FROM users
       WHERE company_id = $1
       ORDER BY id`,
      [companyId],
    );

    res.json({ users: result.rows.map(toPublicUser) });
  },
);

companiesRouter.get(
  "/current/onboarding-link",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    try {
      const link = await getActiveOnboardingLink(companyId);
      res.json(link);
    } catch (err) {
      if (sendInviteUnavailable(err, res)) {
        return;
      }
      throw err;
    }
  },
);

companiesRouter.post(
  "/current/onboarding-link",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    try {
      const created = await rotateOnboardingLink(companyId, req.user!.id);
      res.status(201).json({
        active: true,
        url: created.url,
        createdAt: created.createdAt,
      });
    } catch (err) {
      if (sendInviteUnavailable(err, res)) {
        return;
      }
      throw err;
    }
  },
);

companiesRouter.post(
  "/current/onboarding-link/disable",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    try {
      await disableOnboardingLink(companyId);
      res.json({ ok: true, active: false });
    } catch (err) {
      if (sendInviteUnavailable(err, res)) {
        return;
      }
      throw err;
    }
  },
);
