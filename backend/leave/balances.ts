import type { Pool, PoolClient } from "pg";
import { pool } from "../db.js";

type Queryable = Pool | PoolClient;

export type PublicLeaveBalance = {
  leaveTypeId: number;
  leaveType: string;
  entitled: number;
  taken: number;
  pending: number;
  available: number | null;
  hasBalance: boolean;
  cycleLabel: string | null;
  totalAllowance: number;
  usedDays: number;
  daysRemaining: number;
};

type BalanceRow = {
  balance_id: number | null;
  leave_type_id: number;
  leave_type: string;
  default_days: number;
  entitled_days: number | string;
  days_used: number | string;
  pending_days: number | string | null;
  has_balance: boolean;
  cycle_months: number | null;
};

const BALANCE_SELECT_SQL = `SELECT
         leave_balances.id AS balance_id,
         leave_types.id AS leave_type_id,
         leave_types.name AS leave_type,
         leave_types.default_days,
         COALESCE(
           leave_balances.entitled_days,
           CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END
         ) AS entitled_days,
         COALESCE(leave_balances.days_used, 0) AS days_used,
         COALESCE(pending.pending_days, 0) AS pending_days,
         leave_types.has_balance,
         leave_types.cycle_months
       FROM leave_types
       LEFT JOIN leave_balances
         ON leave_balances.leave_type_id = leave_types.id
        AND leave_balances.company_id = leave_types.company_id
        AND leave_balances.user_id = $1
       LEFT JOIN LATERAL (
         SELECT SUM(request.working_days_count) AS pending_days
         FROM leave_requests AS request
         WHERE request.company_id = leave_types.company_id
           AND request.employee_user_id = $1
           AND request.leave_type_id = leave_types.id
           AND request.status = 'pending'
           AND ($3::INTEGER IS NULL OR request.id <> $3)
       ) AS pending ON true
       WHERE leave_types.company_id = $2
         AND COALESCE(leave_types.is_active, true) = true
         AND ($4::INTEGER IS NULL OR leave_types.id = $4)`;

function roundDays(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function cycleLabel(cycleMonths: number | null): string | null {
  if (cycleMonths === null) return null;
  return `${cycleMonths} ${cycleMonths === 1 ? "month" : "months"}`;
}

export function toPublicBalance(row: BalanceRow): PublicLeaveBalance {
  const entitled = Number(row.entitled_days);
  const taken = Number(row.days_used);
  const pending = Number(row.pending_days ?? 0);
  const hasBalance = row.has_balance;
  const available = hasBalance
    ? roundDays(entitled - taken - pending)
    : null;

  return {
    leaveTypeId: row.leave_type_id,
    leaveType: row.leave_type,
    entitled,
    taken,
    pending,
    available,
    hasBalance,
    cycleLabel: cycleLabel(row.cycle_months),
    totalAllowance: entitled,
    usedDays: taken,
    daysRemaining: available ?? 0,
  };
}

export async function listBalances(
  userId: number,
  companyId: number,
  executor: Queryable = pool,
): Promise<PublicLeaveBalance[]> {
  const result = await executor.query<BalanceRow>(
    `${BALANCE_SELECT_SQL}
     ORDER BY leave_types.name`,
    [userId, companyId, null, null],
  );
  return result.rows.map(toPublicBalance);
}

export async function getBalance(
  userId: number,
  companyId: number,
  leaveTypeId: number,
  executor: Queryable,
  excludePendingRequestId?: number,
): Promise<(PublicLeaveBalance & { hasBalanceRow: boolean }) | null> {
  const result = await executor.query<BalanceRow>(
    `${BALANCE_SELECT_SQL}
     AND leave_types.id = $4
     LIMIT 1`,
    [userId, companyId, excludePendingRequestId ?? null, leaveTypeId],
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    ...toPublicBalance(row),
    hasBalanceRow: row.balance_id !== null,
  };
}

export async function applyApprovedLeaveToBalance(
  userId: number,
  companyId: number,
  leaveTypeId: number,
  workingDaysCount: number,
  executor: Queryable,
): Promise<boolean> {
  const leaveType = await executor.query<{ has_balance: boolean }>(
    `SELECT has_balance
     FROM leave_types
     WHERE id = $1
       AND company_id = $2`,
    [leaveTypeId, companyId],
  );
  if (!leaveType.rows[0]) return false;
  if (!leaveType.rows[0].has_balance) return true;

  const result = await executor.query(
    `UPDATE leave_balances
     SET days_used = days_used + $4,
         days_remaining = days_remaining - $4
     WHERE company_id = $1
       AND user_id = $2
       AND leave_type_id = $3
       AND days_remaining >= $4`,
    [companyId, userId, leaveTypeId, workingDaysCount],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function grantLeaveTypeBalances(
  companyId: number,
  leaveTypeId: number,
  executor: Queryable,
): Promise<void> {
  await executor.query(
    `INSERT INTO leave_balances (
       company_id,
       user_id,
       leave_type_id,
       entitled_days,
       days_remaining,
       days_used
     )
     SELECT
       users.company_id,
       users.id,
       leave_types.id,
       CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END,
       CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END,
       0
     FROM users
     JOIN leave_types
       ON leave_types.company_id = users.company_id
     WHERE users.company_id = $1
       AND users.status = 'active'
       AND users.role <> 'platform'
       AND leave_types.id = $2
     ON CONFLICT (user_id, leave_type_id) DO NOTHING`,
    [companyId, leaveTypeId],
  );
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
       entitled_days,
       days_remaining,
       days_used
     )
     SELECT
       $2,
       $1,
       leave_types.id,
       CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END,
       CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END,
       0
     FROM leave_types
     WHERE leave_types.company_id = $2
       AND COALESCE(leave_types.is_active, true) = true
     ON CONFLICT (user_id, leave_type_id) DO NOTHING`,
    [userId, companyId],
  );
}
