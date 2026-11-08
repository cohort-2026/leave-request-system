import type { PoolClient } from "pg";

export async function hasOverlappingLeaveRequest(
  executor: PoolClient,
  companyId: number,
  employeeUserId: number,
  startDate: string,
  endDate: string,
  excludeRequestId?: number,
): Promise<boolean> {
  const result = await executor.query<{ overlaps: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM leave_requests
       WHERE company_id = $1
         AND employee_user_id = $2
         AND status IN ('pending', 'approved')
         AND ($5::integer IS NULL OR id <> $5)
         AND start_date <= $4::date
         AND end_date >= $3::date
     ) AS overlaps`,
    [companyId, employeeUserId, startDate, endDate, excludeRequestId ?? null],
  );
  return result.rows[0]?.overlaps ?? false;
}
