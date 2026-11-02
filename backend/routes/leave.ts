import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId } from "../tenancy.js";

export const leaveRouter = Router();

type BalanceRow = {
  leave_type: string;
  total_allowance: number;
  days_used: number;
  days_remaining: number;
};

function toPublicBalance(row: BalanceRow) {
  return {
    leaveType: row.leave_type,
    totalAllowance: row.total_allowance,
    usedDays: row.days_used,
    daysRemaining: row.days_remaining,
  };
}

leaveRouter.get(
  "/balances",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const result = await pool.query<BalanceRow>(
      `SELECT leave_types.name AS leave_type,
              leave_types.default_days AS total_allowance,
              leave_balances.days_used,
              leave_balances.days_remaining
       FROM leave_balances
       JOIN leave_types
         ON leave_types.id = leave_balances.leave_type_id
        AND leave_types.company_id = leave_balances.company_id
       WHERE leave_balances.user_id = $1
         AND leave_balances.company_id = $2
         AND COALESCE(leave_types.is_active, true) = true
       ORDER BY leave_types.name`,
      [req.user!.id, companyId],
    );

    res.json({ balances: result.rows.map(toPublicBalance) });
  },
);
