import { Router } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import {
  completePaidSignup,
  createSignupCheckout,
  isCompaniesTableMissing,
  isEmailTaken,
  mockPayAllowed,
} from "../companies/signup.js";
import { pool } from "../db.js";
import type { WorkingDayFlags } from "../leave/workingDays.js";
import { ensureZaHolidaysForCompany, insertZaHolidays } from "../leave/seedZaHolidays.js";
import { isZaHolidayYear, zaPublicHolidays } from "../leave/zaHolidays.js";
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
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_SLOGAN_LEN = 120;
const MAX_LOGO_BYTES = 1_000_000;
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1 },
});

function asHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : null;
}

function asSlogan(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_SLOGAN_LEN) return undefined;
  return trimmed;
}

function isUndefinedColumn(err: unknown): boolean {
  return Boolean(
    err && typeof err === "object" && "code" in err && err.code === "42703",
  );
}

function parseLogoPayload(body: {
  logoBase64?: unknown;
  logoMime?: unknown;
}): { logo: Buffer; mime: string } | null | "invalid" {
  if (body.logoBase64 == null && body.logoMime == null) {
    return null;
  }
  if (typeof body.logoBase64 !== "string" || typeof body.logoMime !== "string") {
    return "invalid";
  }
  if (!LOGO_TYPES.has(body.logoMime)) {
    return "invalid";
  }
  try {
    const logo = Buffer.from(body.logoBase64, "base64");
    if (!logo.length || logo.length > MAX_LOGO_BYTES) {
      return "invalid";
    }
    return { logo, mime: body.logoMime };
  } catch {
    return "invalid";
  }
}

async function fetchCompanyPublic(companyId: number) {
  try {
    const result = await pool.query<CompanyPublicRow>(
      `${COMPANY_PUBLIC_SQL}
       WHERE id = $1
       LIMIT 1`,
      [companyId],
    );
    return result.rows[0] ?? null;
  } catch (err) {
    if (!isUndefinedColumn(err)) {
      throw err;
    }
    const result = await pool.query<
      Omit<
        CompanyPublicRow,
        | "slogan"
        | "brand_primary"
        | "brand_accent"
        | "brand_colors_manual"
        | "has_logo"
      >
    >(
      `SELECT id, name, slug, status, trial_ends_at
       FROM companies
       WHERE id = $1
       LIMIT 1`,
      [companyId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...row,
      slogan: null,
      brand_primary: null,
      brand_accent: null,
      brand_colors_manual: false,
      has_logo: false,
    };
  }
}

type CompanyPublicRow = {
  id: number;
  name: string;
  slug: string;
  status: string;
  trial_ends_at: Date | null;
  slogan: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  brand_colors_manual: boolean;
  has_logo: boolean;
};

function toPublicCompany(row: CompanyPublicRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    trialEndsAt: row.trial_ends_at ? row.trial_ends_at.toISOString() : null,
    slogan: row.slogan ?? null,
    brandPrimary: row.brand_primary ?? null,
    brandAccent: row.brand_accent ?? null,
    brandColorsManual: Boolean(row.brand_colors_manual),
    hasLogo: Boolean(row.has_logo),
    logoUrl: row.has_logo ? "/api/companies/current/logo" : null,
  };
}

const COMPANY_PUBLIC_SQL = `SELECT id, name, slug, status, trial_ends_at,
       slogan, brand_primary, brand_accent, brand_colors_manual,
       (logo IS NOT NULL) AS has_logo
     FROM companies`;
const STAFF_REVIEWERS = ["manager", "company_admin"] as const;

type StaffReviewer = (typeof STAFF_REVIEWERS)[number];
type CompanyLeaveRulesRow = {
  staff_reviewer: StaffReviewer;
  manager_reviewer: "company_admin";
  min_notice_days: number;
  escalate_after_hours: string | number;
  auto_approve_after_hours: string | number;
};

function isStaffReviewer(value: unknown): value is StaffReviewer {
  return (
    typeof value === "string" &&
    (STAFF_REVIEWERS as readonly string[]).includes(value)
  );
}

function toPublicCompanyLeaveRules(row: CompanyLeaveRulesRow) {
  return {
    staffReviewer: row.staff_reviewer,
    managerReviewer: row.manager_reviewer,
    minNoticeDays: row.min_notice_days,
    escalateAfterHours: Number(row.escalate_after_hours),
    autoApproveAfterHours: Number(row.auto_approve_after_hours),
  };
}

const MAX_TIMEOUT_HOURS = 87_600;

function isValidTimeoutHours(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_TIMEOUT_HOURS &&
    Number.isInteger(value * 4)
  );
}

type DepartmentRow = {
  id: number;
  name: string;
  manager_id: number | null;
  manager_name: string | null;
};

type CompanyUserRow = Pick<
  UserRow,
  | "id"
  | "email"
  | "role"
  | "display_name"
  | "status"
  | "company_name"
  | "company_id"
> &
  Partial<Pick<UserRow, "department_id" | "department_name">>;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function toPublicDepartment(row: DepartmentRow) {
  return {
    id: row.id,
    name: row.name,
    managerId: row.manager_id,
    managerName: row.manager_name,
  };
}

function isDepartmentNameConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23505" &&
    "constraint" in err &&
    err.constraint === "departments_company_id_name_unique_idx"
  );
}

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
  source: string;
  actualDate: string | null;
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
  await ensureZaHolidaysForCompany(companyId);
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
    `SELECT id,
            holiday_date::TEXT AS date,
            name,
            COALESCE(source, 'custom') AS source,
            actual_date::TEXT AS "actualDate"
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

companiesRouter.get(
  "/current/departments",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const result = await pool.query<DepartmentRow>(
      `SELECT departments.id, departments.name, departments.manager_id,
              COALESCE(users.display_name, users.email) AS manager_name
       FROM departments
       LEFT JOIN users
         ON users.id = departments.manager_id
        AND users.company_id = departments.company_id
       WHERE departments.company_id = $1
       ORDER BY LOWER(departments.name), departments.id`,
      [companyId],
    );

    res.json({ departments: result.rows.map(toPublicDepartment) });
  },
);

companiesRouter.post(
  "/current/departments",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const name = asNonEmptyString(req.body?.name);
    if (!name) {
      res.status(400).json({ error: "Department name required" });
      return;
    }
    if (name.length > 80) {
      res.status(400).json({
        error: "Department name must be 80 characters or fewer",
      });
      return;
    }

    try {
      const result = await pool.query<DepartmentRow>(
        `INSERT INTO departments (company_id, name)
         VALUES ($1, $2)
         RETURNING id, name, manager_id, NULL::text AS manager_name`,
        [companyId, name],
      );
      res.status(201).json(toPublicDepartment(result.rows[0]));
    } catch (error: unknown) {
      if (isDepartmentNameConflict(error)) {
        res.status(409).json({
          error: "A department with this name already exists",
        });
        return;
      }
      throw error;
    }
  },
);

companiesRouter.patch(
  "/current/departments/:id/manager",
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

    const managerIdValue = req.body?.managerId;
    if (managerIdValue !== null && !isPositiveInteger(managerIdValue)) {
      res.status(400).json({ error: "Invalid manager id" });
      return;
    }
    const managerId: number | null = managerIdValue;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (managerId !== null) {
        const manager = await client.query(
          `SELECT id
           FROM users
           WHERE id = $1 AND company_id = $2 AND role = 'manager'
           FOR UPDATE`,
          [managerId, companyId],
        );
        if (manager.rowCount === 0) {
          await client.query("ROLLBACK");
          res.status(400).json({
            error: "Manager must have the manager role in your company",
          });
          return;
        }
      }

      const updated = await client.query<DepartmentRow>(
        `UPDATE departments
         SET manager_id = $1
         WHERE id = $2 AND company_id = $3
         RETURNING id, name, manager_id,
           (
             SELECT COALESCE(users.display_name, users.email)
             FROM users
             WHERE users.id = departments.manager_id
               AND users.company_id = departments.company_id
           ) AS manager_name`,
        [managerId, departmentId, companyId],
      );
      if (updated.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Department not found" });
        return;
      }

      await client.query("COMMIT");
      res.json(toPublicDepartment(updated.rows[0]));
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

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
    const slogan = asSlogan(req.body?.slogan);
    if (req.body?.slogan !== undefined && slogan === undefined) {
      res.status(400).json({ error: "Slogan must be at most 120 characters" });
      return;
    }
    const brandPrimary =
      req.body?.brandPrimary == null
        ? null
        : asHexColor(req.body.brandPrimary);
    const brandAccent =
      req.body?.brandAccent == null
        ? null
        : asHexColor(req.body.brandAccent);
    if (req.body?.brandPrimary != null && !brandPrimary) {
      res.status(400).json({ error: "Brand colour must be a hex value such as #059669" });
      return;
    }
    if (req.body?.brandAccent != null && !brandAccent) {
      res.status(400).json({ error: "Hover colour must be a hex value such as #047857" });
      return;
    }
    const logo = parseLogoPayload(req.body ?? {});
    if (logo === "invalid") {
      res.status(400).json({ error: "Logo must be a PNG, JPG, or WEBP under 1 MB" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const created = await createSignupCheckout({
      companyName,
      email: email.toLowerCase(),
      passwordHash: hash,
      displayName,
      planCode,
      branding: {
        slogan: slogan ?? null,
        brandPrimary,
        brandAccent,
        brandColorsManual: req.body?.brandColorsManual === true,
        logo: logo?.logo ?? null,
        logoMime: logo?.mime ?? null,
      },
    });
    if (created === "bad_plan") {
      res.status(400).json({ error: "Unknown plan" });
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

  const row = await fetchCompanyPublic(companyId);
  if (!row) {
    res.status(403).json({ error: NOT_IN_COMPANY });
    return;
  }

  res.json(toPublicCompany(row));
});

companiesRouter.patch(
  "/current/branding",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const slogan = asSlogan(req.body?.slogan);
    if (req.body?.slogan !== undefined && slogan === undefined) {
      res.status(400).json({ error: "Slogan must be at most 120 characters" });
      return;
    }
    const brandPrimary =
      req.body?.brandPrimary === null
        ? null
        : req.body?.brandPrimary !== undefined
          ? asHexColor(req.body.brandPrimary)
          : undefined;
    const brandAccent =
      req.body?.brandAccent === null
        ? null
        : req.body?.brandAccent !== undefined
          ? asHexColor(req.body.brandAccent)
          : undefined;
    if (req.body?.brandPrimary !== undefined && brandPrimary === undefined) {
      res.status(400).json({ error: "Brand colour must be a hex value such as #059669" });
      return;
    }
    if (req.body?.brandAccent !== undefined && brandAccent === undefined) {
      res.status(400).json({ error: "Hover colour must be a hex value such as #047857" });
      return;
    }

    try {
      await pool.query(
        `UPDATE companies
         SET slogan = $2,
             brand_primary = $3,
             brand_accent = $4,
             brand_colors_manual = $5
         WHERE id = $1`,
        [
          companyId,
          slogan === undefined ? null : slogan,
          brandPrimary === undefined ? null : brandPrimary,
          brandAccent === undefined ? null : brandAccent,
          typeof req.body?.brandColorsManual === "boolean"
            ? req.body.brandColorsManual
            : false,
        ],
      );
    } catch (err) {
      if (isCompaniesTableMissing(err) || isUndefinedColumn(err)) {
        res.status(503).json({ error: "Appearance is not available yet." });
        return;
      }
      throw err;
    }
    const fresh = await fetchCompanyPublic(companyId);
    res.json(toPublicCompany(fresh!));
  },
);

companiesRouter.get(
  "/current/logo",
  requireAuth,
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;
    let row: { logo: Buffer; logo_mime: string | null } | undefined;
    try {
      const result = await pool.query<{ logo: Buffer; logo_mime: string | null }>(
        `SELECT logo, logo_mime FROM companies WHERE id = $1 LIMIT 1`,
        [companyId],
      );
      row = result.rows[0];
    } catch (err) {
      if (isCompaniesTableMissing(err) || isUndefinedColumn(err)) {
        res.status(404).json({ error: "No logo uploaded" });
        return;
      }
      throw err;
    }
    if (!row?.logo) {
      res.status(404).json({ error: "No logo uploaded" });
      return;
    }
    res.setHeader("Content-Type", row.logo_mime || "image/png");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(row.logo);
  },
);

companiesRouter.post(
  "/current/logo",
  requireAuth,
  requireRole("company_admin"),
  logoUpload.single("logo"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Choose a PNG, JPG, or WEBP logo" });
      return;
    }
    if (!LOGO_TYPES.has(file.mimetype)) {
      res.status(415).json({ error: "Logo must be PNG, JPG, or WEBP" });
      return;
    }

    try {
      await pool.query(
        `UPDATE companies
         SET logo = $2, logo_mime = $3
         WHERE id = $1`,
        [companyId, file.buffer, file.mimetype],
      );
    } catch (err) {
      if (isCompaniesTableMissing(err) || isUndefinedColumn(err)) {
        res.status(503).json({ error: "Appearance is not available yet." });
        return;
      }
      throw err;
    }
    const fresh = await fetchCompanyPublic(companyId);
    res.json(toPublicCompany(fresh!));
  },
);

companiesRouter.delete(
  "/current/logo",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;
    try {
      await pool.query(
        `UPDATE companies SET logo = NULL, logo_mime = NULL WHERE id = $1`,
        [companyId],
      );
    } catch (err) {
      if (isCompaniesTableMissing(err) || isUndefinedColumn(err)) {
        res.status(503).json({ error: "Appearance is not available yet." });
        return;
      }
      throw err;
    }
    const fresh = await fetchCompanyPublic(companyId);
    res.json(toPublicCompany(fresh!));
  },
);

companiesRouter.get(
  "/current/rules",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    await pool.query(
      `INSERT INTO company_leave_rules (company_id)
       VALUES ($1)
       ON CONFLICT (company_id) DO NOTHING`,
      [companyId],
    );
    const result = await pool.query<CompanyLeaveRulesRow>(
      `SELECT staff_reviewer, manager_reviewer, min_notice_days,
              escalate_after_hours, auto_approve_after_hours
       FROM company_leave_rules
       WHERE company_id = $1`,
      [companyId],
    );
    const rules = result.rows[0];
    if (!rules) {
      throw new Error("Company leave rules were not available after insert");
    }

    res.json(toPublicCompanyLeaveRules(rules));
  },
);

companiesRouter.patch(
  "/current/rules",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const body: unknown = req.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      res.status(400).json({ error: "Invalid company rules" });
      return;
    }

    const values = body as Record<string, unknown>;
    const allowedFields = new Set([
      "staffReviewer",
      "managerReviewer",
      "minNoticeDays",
      "escalateAfterHours",
      "autoApproveAfterHours",
    ]);
    const providedFields = Object.keys(values);
    if (
      providedFields.length === 0 ||
      providedFields.some((field) => !allowedFields.has(field))
    ) {
      res.status(400).json({ error: "Provide at least one valid company rule" });
      return;
    }
    const hasStaffReviewer = Object.prototype.hasOwnProperty.call(
      values,
      "staffReviewer",
    );
    let staffReviewer: StaffReviewer | undefined;
    if (hasStaffReviewer) {
      if (!isStaffReviewer(values.staffReviewer)) {
        res.status(400).json({ error: "Invalid staff reviewer" });
        return;
      }
      staffReviewer = values.staffReviewer;
    }

    const hasManagerReviewer = Object.prototype.hasOwnProperty.call(
      values,
      "managerReviewer",
    );
    if (hasManagerReviewer && values.managerReviewer !== "company_admin") {
      res.status(400).json({
        error: "Manager leave must be reviewed by a company admin",
      });
      return;
    }

    const hasMinNoticeDays = Object.prototype.hasOwnProperty.call(
      values,
      "minNoticeDays",
    );
    let minNoticeDays: number | undefined;
    if (hasMinNoticeDays) {
      const value = values.minNoticeDays;
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 2_147_483_647
      ) {
        res.status(400).json({
          error: "Minimum notice days must be a non-negative integer",
        });
        return;
      }
      minNoticeDays = value;
    }

    const hasEscalateAfterHours = Object.prototype.hasOwnProperty.call(
      values,
      "escalateAfterHours",
    );
    if (
      hasEscalateAfterHours &&
      !isValidTimeoutHours(values.escalateAfterHours)
    ) {
      res.status(400).json({
        error: "Escalate-after hours must be a non-negative quarter-hour value",
      });
      return;
    }

    const hasAutoApproveAfterHours = Object.prototype.hasOwnProperty.call(
      values,
      "autoApproveAfterHours",
    );
    if (
      hasAutoApproveAfterHours &&
      !isValidTimeoutHours(values.autoApproveAfterHours)
    ) {
      res.status(400).json({
        error: "Auto-approve-after hours must be a non-negative quarter-hour value",
      });
      return;
    }

    const currentResult = await pool.query<CompanyLeaveRulesRow>(
      `SELECT staff_reviewer, manager_reviewer, min_notice_days,
              escalate_after_hours, auto_approve_after_hours
       FROM company_leave_rules
       WHERE company_id = $1`,
      [companyId],
    );
    const current = currentResult.rows[0];
    const effectiveEscalateHours = hasEscalateAfterHours
      ? Number(values.escalateAfterHours)
      : Number(current?.escalate_after_hours ?? 0);
    const effectiveAutoApproveHours = hasAutoApproveAfterHours
      ? Number(values.autoApproveAfterHours)
      : Number(current?.auto_approve_after_hours ?? 0);
    if (
      effectiveEscalateHours > 0 &&
      effectiveAutoApproveHours > 0 &&
      effectiveAutoApproveHours < effectiveEscalateHours
    ) {
      res.status(400).json({
        error: "Auto-approve-after hours must be at least escalate-after hours",
      });
      return;
    }

    const assignments: string[] = [];
    const parameters: (number | string)[] = [companyId];
    if (staffReviewer !== undefined) {
      parameters.push(staffReviewer);
      assignments.push(`staff_reviewer = $${parameters.length}`);
    }
    if (hasManagerReviewer) {
      parameters.push("company_admin");
      assignments.push(`manager_reviewer = $${parameters.length}`);
    }
    if (minNoticeDays !== undefined) {
      parameters.push(minNoticeDays);
      assignments.push(`min_notice_days = $${parameters.length}`);
    }
    if (hasEscalateAfterHours) {
      parameters.push(Number(values.escalateAfterHours));
      assignments.push(`escalate_after_hours = $${parameters.length}`);
    }
    if (hasAutoApproveAfterHours) {
      parameters.push(Number(values.autoApproveAfterHours));
      assignments.push(`auto_approve_after_hours = $${parameters.length}`);
    }

    await pool.query(
      `INSERT INTO company_leave_rules (company_id)
       VALUES ($1)
       ON CONFLICT (company_id) DO NOTHING`,
      [companyId],
    );
    const updated = await pool.query<CompanyLeaveRulesRow>(
      `UPDATE company_leave_rules
       SET ${assignments.join(", ")}
       WHERE company_id = $1
       RETURNING staff_reviewer, manager_reviewer, min_notice_days,
                 escalate_after_hours, auto_approve_after_hours`,
      parameters,
    );
    const rules = updated.rows[0];
    if (!rules) {
      throw new Error("Company leave rules were not available after update");
    }

    res.json(toPublicCompanyLeaveRules(rules));
  },
);

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
        `INSERT INTO public_holidays (company_id, holiday_date, name, source)
         VALUES ($1, $2, $3, 'custom')
         RETURNING id,
                   holiday_date::TEXT AS date,
                   name,
                   COALESCE(source, 'custom') AS source,
                   actual_date::TEXT AS "actualDate"`,
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

companiesRouter.post(
  "/current/holidays/seed-za",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const rawYear = Array.isArray(req.query.year)
      ? req.query.year[0]
      : req.query.year;
    const year = typeof rawYear === "string" ? Number(rawYear) : Number.NaN;
    if (!Number.isInteger(year) || !isZaHolidayYear(year)) {
      res.status(400).json({
        error: "Year must be an integer from 2026 to 2030",
      });
      return;
    }

    const holidays = zaPublicHolidays(year);
    const added = await insertZaHolidays(companyId, year);

    const calendar = await readCompanyCalendar(companyId);
    if (!calendar) {
      res.status(403).json({ error: NOT_IN_COMPANY });
      return;
    }

    res.json({
      year,
      added,
      holidays: calendar.holidays,
      observed: holidays
        .filter((holiday) => holiday.actualDate !== null)
        .map((holiday) => ({
          name: holiday.name,
          date: holiday.date,
          actualDate: holiday.actualDate,
        })),
    });
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

    const result = await pool.query<CompanyUserRow>(
      `SELECT users.id, users.email, users.role, users.display_name,
              users.status, users.company_name, users.company_id,
              users.department_id, departments.name AS department_name
       FROM users
       LEFT JOIN departments
         ON departments.id = users.department_id
        AND departments.company_id = users.company_id
       WHERE users.company_id = $1
       ORDER BY users.id`,
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
