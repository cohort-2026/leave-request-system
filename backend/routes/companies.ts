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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_REVIEWERS = ["manager", "company_admin"] as const;

type StaffReviewer = (typeof STAFF_REVIEWERS)[number];
type CompanyLeaveRulesRow = {
  staff_reviewer: StaffReviewer;
  manager_reviewer: "company_admin";
  min_notice_days: number;
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
  };
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
      `SELECT staff_reviewer, manager_reviewer, min_notice_days
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
       RETURNING staff_reviewer, manager_reviewer, min_notice_days`,
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
