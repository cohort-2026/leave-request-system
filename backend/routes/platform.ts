import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const platformRouter = Router();

type PlatformCompanyRow = {
  id: number;
  name: string;
  slug: string;
  status: string;
  subscription_status: string | null;
  plan_name: string | null;
  seat_limit: number | null;
  seats_used: number;
};

platformRouter.get(
  "/companies",
  requireAuth,
  requireRole("platform"),
  async (_req, res) => {
    const result = await pool.query<PlatformCompanyRow>(
      `SELECT
         company.id,
         company.name,
         company.slug,
         company.status,
         subscription.status AS subscription_status,
         plan.name AS plan_name,
         plan.seat_limit,
         COUNT(company_user.id) FILTER (
           WHERE company_user.status IN ('active', 'pending_verification')
             AND company_user.role <> 'platform'
         )::INTEGER AS seats_used
       FROM companies AS company
       LEFT JOIN subscriptions AS subscription
         ON subscription.company_id = company.id
       LEFT JOIN plans AS plan
         ON plan.code = subscription.plan_code
       LEFT JOIN users AS company_user
         ON company_user.company_id = company.id
       GROUP BY company.id, subscription.id, plan.code
       ORDER BY LOWER(company.name), company.id`,
    );

    res.json({
      companies: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        subscriptionStatus: row.subscription_status,
        planName: row.plan_name,
        seatLimit: row.seat_limit,
        seatsUsed: row.seats_used,
      })),
    });
  },
);
