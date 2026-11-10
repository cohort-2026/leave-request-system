import { Router } from "express";
import { pool } from "../db.js";
import { listBalances } from "../leave/balances.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId } from "../tenancy.js";

export const homeRouter = Router();

type RecentRequestRow = {
  id: number;
  requester_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
};

homeRouter.get(
  "/",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const userId = req.user!.id;
    const [balances, pendingResult, recentResult] = await Promise.all([
      listBalances(userId, companyId),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM leave_requests
         WHERE company_id = $1
           AND employee_user_id = $2
           AND status = 'pending'`,
        [companyId, userId],
      ),
      pool.query<RecentRequestRow>(
        `SELECT
           lr.id,
           COALESCE(employee.display_name, employee.email) AS requester_name,
           leave_types.name AS leave_type,
           lr.start_date::TEXT AS start_date,
           lr.end_date::TEXT AS end_date,
           lr.status
         FROM leave_requests AS lr
         JOIN users AS employee
           ON employee.id = lr.employee_user_id
          AND employee.company_id = lr.company_id
         JOIN leave_types
           ON leave_types.id = lr.leave_type_id
          AND leave_types.company_id = lr.company_id
         WHERE lr.company_id = $1
           AND lr.employee_user_id = $2
         ORDER BY lr.submitted_at DESC, lr.id DESC
         LIMIT 5`,
        [companyId, userId],
      ),
    ]);

    res.json({
      balances: balances.map((balance) => ({
        leaveType: balance.leaveType,
        daysRemaining: balance.daysRemaining,
        daysUsed: balance.usedDays,
      })),
      pendingCount: Number(pendingResult.rows[0]?.count ?? 0),
      recent: recentResult.rows.map((request) => ({
        id: String(request.id),
        requesterName: request.requester_name,
        leaveType: request.leave_type,
        startDate: request.start_date,
        endDate: request.end_date,
        status: request.status,
      })),
    });
  },
);
