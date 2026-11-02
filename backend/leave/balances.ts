import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";

type Queryable = Pool | PoolClient;

export type PublicLeaveBalance = {
  leaveType: string;
  totalAllowance: number;
  usedDays: number;
  daysRemaining: number;
};

type BalanceRow = {
  leave_type: string;
  total_allowance: number;
  days_used: number;
  days_remaining: number;
};

export function toPublicBalance(row: BalanceRow): PublicLeaveBalance {
  return {
    leaveType: row.leave_type,
    totalAllowance: Number(row.total_allowance),
    usedDays: Number(row.days_used),
    daysRemaining: Number(row.days_remaining),
  };
}

// Active types only. Remaining and used come from the stored row, never from
// the client. Do not decrement here (feature 09).
const LIST_BALANCES_SQL = `SELECT leave_types.name AS leave_type,
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
       ORDER BY leave_types.name`;

export async function listBalances(
  userId: number,
  companyId: number,
  executor: Queryable = pool,
): Promise<PublicLeaveBalance[]> {
  const result = await executor.query<BalanceRow>(LIST_BALANCES_SQL, [
    userId,
    companyId,
  ]);
  return result.rows.map(toPublicBalance);
}

export async function grantDefaultBalances(
  userId: number,
  companyId: number,
  executor: Queryable = pool,
): Promise<void> {
  await executor.query(
    `INSERT INTO leave_balances (
       company_id,
       user_id,
       leave_type_id,
       days_remaining,
       days_used
     )
     SELECT
       $2,
       $1,
       leave_types.id,
       leave_types.default_days,
       0
     FROM leave_types
     WHERE leave_types.company_id = $2
       AND COALESCE(leave_types.is_active, true) = true
     ON CONFLICT (user_id, leave_type_id) DO NOTHING`,
    [userId, companyId],
  );
}
