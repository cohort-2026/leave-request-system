import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  disableOnboardingLink,
  getActiveOnboardingLink,
  isOnboardingTableMissing,
  rotateOnboardingLink,
} from "../onboarding/index.js";
import { toPublicUser, type UserRow } from "../session.js";

export const companiesRouter = Router();

const NOT_IN_COMPANY = "You are not in a company";
const INVITES_UNAVAILABLE = "Invite links are not available yet.";

function companyNameOf(
  req: { user?: { company_name: string | null } },
  res: { status: (code: number) => { json: (body: unknown) => void } },
): string | null {
  const name = req.user?.company_name?.trim();
  if (!name) {
    res.status(403).json({ error: NOT_IN_COMPANY });
    return null;
  }
  return name;
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

companiesRouter.get(
  "/current/users",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyName = companyNameOf(req, res);
    if (!companyName) {
      return;
    }

    const result = await pool.query<
      Pick<
        UserRow,
        "id" | "email" | "role" | "display_name" | "status" | "company_name"
      >
    >(
      `SELECT id, email, role, display_name, status, company_name
       FROM users
       WHERE company_name = $1
       ORDER BY id`,
      [companyName],
    );

    res.json({ users: result.rows.map(toPublicUser) });
  },
);

companiesRouter.get(
  "/current/onboarding-link",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyName = companyNameOf(req, res);
    if (!companyName) {
      return;
    }

    try {
      const link = await getActiveOnboardingLink(companyName);
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
    const companyName = companyNameOf(req, res);
    if (!companyName) {
      return;
    }

    try {
      const created = await rotateOnboardingLink(companyName, req.user!.id);
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
    const companyName = companyNameOf(req, res);
    if (!companyName) {
      return;
    }

    try {
      await disableOnboardingLink(companyName);
      res.json({ ok: true, active: false });
    } catch (err) {
      if (sendInviteUnavailable(err, res)) {
        return;
      }
      throw err;
    }
  },
);
