import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

export type DateBlockMode = "block" | "warn";
export type LeaveWarningKind = "block" | "warn" | "clash";

export type LeaveWarning = {
  kind: LeaveWarningKind;
  message: string;
};

export type DateBlockRecord = {
  id: number;
  departmentId: number | null;
  startsOn: string;
  endsOn: string;
  mode: DateBlockMode;
  reason: string;
};

export type LeavePolicyContext = {
  ignoresBlocks: boolean;
  departmentId: number | null;
  departmentName: string | null;
  maxOff: number | null;
  startDate: string;
  endDate: string;
  blocks: DateBlockRecord[];
  othersOffInDepartment: number;
};

export function periodsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && endA >= startB;
}

export function matchingDateBlocks(
  blocks: DateBlockRecord[],
  startDate: string,
  endDate: string,
  departmentId: number | null,
): DateBlockRecord[] {
  return blocks.filter(
    (block) =>
      periodsOverlap(block.startsOn, block.endsOn, startDate, endDate) &&
      (block.departmentId === null || block.departmentId === departmentId),
  );
}

export function buildLeavePolicyWarnings(
  context: LeavePolicyContext,
): LeaveWarning[] {
  const warnings: LeaveWarning[] = [];
  if (!context.ignoresBlocks) {
    for (const block of matchingDateBlocks(
      context.blocks,
      context.startDate,
      context.endDate,
      context.departmentId,
    )) {
      warnings.push({
        kind: block.mode,
        message: block.reason,
      });
    }
  }

  if (
    context.departmentId !== null &&
    context.maxOff !== null &&
    context.othersOffInDepartment + 1 > context.maxOff
  ) {
    const department = context.departmentName ?? "this department";
    warnings.push({
      kind: "clash",
      message: `This would take ${department} over its maximum of ${context.maxOff} people off`,
    });
  }

  return warnings;
}

export function firstBlockWarning(
  warnings: LeaveWarning[],
): LeaveWarning | undefined {
  return warnings.find((warning) => warning.kind === "block");
}

type LeaveTypeBlockRow = {
  ignores_blocks: boolean;
};

type DepartmentPolicyRow = {
  department_id: number | null;
  department_name: string | null;
  max_off: number | null;
};

type DateBlockRow = {
  id: number;
  department_id: number | null;
  starts_on: string;
  ends_on: string;
  mode: DateBlockMode;
  reason: string;
};

export async function loadLeavePolicyWarnings(
  executor: Queryable,
  input: {
    companyId: number;
    userId: number;
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    excludeRequestId?: number;
  },
): Promise<LeaveWarning[]> {
  const leaveTypeResult = await executor.query<LeaveTypeBlockRow>(
    `SELECT COALESCE(ignores_blocks, false) AS ignores_blocks
     FROM leave_types
     WHERE id = $1
       AND company_id = $2
     LIMIT 1`,
    [input.leaveTypeId, input.companyId],
  );
  const ignoresBlocks = Boolean(leaveTypeResult.rows[0]?.ignores_blocks);

  const departmentResult = await executor.query<DepartmentPolicyRow>(
    `SELECT
       users.department_id,
       departments.name AS department_name,
       departments.max_off
     FROM users
     LEFT JOIN departments
       ON departments.id = users.department_id
      AND departments.company_id = users.company_id
     WHERE users.id = $1
       AND users.company_id = $2
     LIMIT 1`,
    [input.userId, input.companyId],
  );
  const department = departmentResult.rows[0];
  const departmentId = department?.department_id ?? null;
  const departmentName = department?.department_name ?? null;
  const maxOff =
    department?.max_off === null || department?.max_off === undefined
      ? null
      : Number(department.max_off);

  const blocksResult = await executor.query<DateBlockRow>(
    `SELECT
       id,
       department_id,
       starts_on::TEXT AS starts_on,
       ends_on::TEXT AS ends_on,
       mode,
       reason
     FROM date_blocks
     WHERE company_id = $1
       AND starts_on <= $3::date
       AND ends_on >= $2::date
       AND (department_id IS NULL OR department_id = $4)
     ORDER BY starts_on, id`,
    [input.companyId, input.startDate, input.endDate, departmentId],
  );

  let othersOffInDepartment = 0;
  if (departmentId !== null && maxOff !== null) {
    const othersResult = await executor.query<{ count: string }>(
      `SELECT COUNT(DISTINCT leave_requests.employee_user_id)::INT AS count
       FROM leave_requests
       JOIN users
         ON users.id = leave_requests.employee_user_id
        AND users.company_id = leave_requests.company_id
       WHERE leave_requests.company_id = $1
         AND leave_requests.status IN ('pending', 'approved')
         AND leave_requests.start_date <= $3::date
         AND leave_requests.end_date >= $2::date
         AND leave_requests.employee_user_id <> $4
         AND ($5::integer IS NULL OR leave_requests.id <> $5)
         AND users.department_id = $6`,
      [
        input.companyId,
        input.startDate,
        input.endDate,
        input.userId,
        input.excludeRequestId ?? null,
        departmentId,
      ],
    );
    othersOffInDepartment = Number(othersResult.rows[0]?.count ?? 0);
  }

  return buildLeavePolicyWarnings({
    ignoresBlocks,
    departmentId,
    departmentName,
    maxOff,
    startDate: input.startDate,
    endDate: input.endDate,
    blocks: blocksResult.rows.map((row) => ({
      id: row.id,
      departmentId: row.department_id,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      mode: row.mode,
      reason: row.reason,
    })),
    othersOffInDepartment,
  });
}
