import type { PoolClient } from "pg";
import { pool } from "../db.js";
import {
  appOrigin,
  leaveDecision,
  leaveEscalated,
  sendMail,
} from "../mail/index.js";
import { applyApprovedLeaveToBalance } from "./balances.js";

const AUTO_APPROVE_REASON = "Automatically approved after the company timeout";

type DueRequest = {
  id: number;
  company_id: number;
  employee_user_id: number;
  leave_type_id: number;
  working_days_count: number;
  start_date: string;
  end_date: string;
  original_reviewer_id: number | null;
  escalate_after_hours: string;
  auto_approve_after_hours: string;
  escalation_due: boolean;
  auto_approve_due: boolean;
  employee_email: string;
  employee_name: string;
  leave_type: string;
};

type EscalationReviewer = {
  id: number;
  email: string;
  name: string;
};

export type EscalationRunResult = {
  escalated: number;
  autoApproved: number;
  skipped: number;
  errors: string[];
};

async function findEscalationReviewer(
  request: DueRequest,
  executor: PoolClient,
): Promise<EscalationReviewer | null> {
  const excludedIds = [request.employee_user_id, request.original_reviewer_id]
    .filter((id): id is number => id !== null);
  const managers = await executor.query<EscalationReviewer>(
    `SELECT id, email, COALESCE(display_name, email) AS name
     FROM users
     WHERE company_id = $1
       AND role = 'manager'
       AND status = 'active'
       AND id <> ALL($2::INTEGER[])
       AND NOT EXISTS (
         SELECT 1
         FROM leave_request_assignees
         WHERE leave_request_id = $3
           AND user_id = users.id
       )
     ORDER BY id
     LIMIT 1`,
    [request.company_id, excludedIds, request.id],
  );
  if (managers.rows[0]) return managers.rows[0];

  const admins = await executor.query<EscalationReviewer>(
    `SELECT id, email, COALESCE(display_name, email) AS name
     FROM users
     WHERE company_id = $1
       AND role = 'company_admin'
       AND status = 'active'
       AND id <> ALL($2::INTEGER[])
       AND NOT EXISTS (
         SELECT 1
         FROM leave_request_assignees
         WHERE leave_request_id = $3
           AND user_id = users.id
       )
     ORDER BY id
     LIMIT 1`,
    [request.company_id, excludedIds, request.id],
  );
  return admins.rows[0] ?? null;
}

async function processRequest(
  id: number,
  companyId?: number,
): Promise<"escalated" | "approved" | "skipped"> {
  const client = await pool.connect();
  let due: DueRequest | null = null;
  let outcome: "escalated" | "approved" | "skipped" = "skipped";
  let reviewer: EscalationReviewer | null = null;

  try {
    await client.query("BEGIN");
    const result = await client.query<DueRequest>(
      `SELECT
         lr.id,
         lr.company_id,
         lr.employee_user_id,
         lr.leave_type_id,
         lr.working_days_count,
         lr.start_date::TEXT AS start_date,
         lr.end_date::TEXT AS end_date,
         lr.reviewer_user_id AS original_reviewer_id,
         rules.escalate_after_hours::TEXT AS escalate_after_hours,
         rules.auto_approve_after_hours::TEXT AS auto_approve_after_hours,
         (
           rules.escalate_after_hours > 0
           AND NOW() >= lr.submitted_at
             + rules.escalate_after_hours::DOUBLE PRECISION * INTERVAL '1 hour'
         ) AS escalation_due,
         (
           rules.auto_approve_after_hours > 0
           AND NOW() >= lr.submitted_at
             + rules.auto_approve_after_hours::DOUBLE PRECISION * INTERVAL '1 hour'
         ) AS auto_approve_due,
         employee.email AS employee_email,
         COALESCE(employee.display_name, employee.email) AS employee_name,
         leave_types.name AS leave_type
       FROM leave_requests AS lr
       JOIN company_leave_rules AS rules
         ON rules.company_id = lr.company_id
       JOIN users AS employee
         ON employee.id = lr.employee_user_id
        AND employee.company_id = lr.company_id
       JOIN leave_types
         ON leave_types.id = lr.leave_type_id
        AND leave_types.company_id = lr.company_id
       WHERE lr.id = $1
         AND lr.status = 'pending'
         AND ($2::INTEGER IS NULL OR lr.company_id = $2)
       FOR UPDATE OF lr`,
      [id, companyId ?? null],
    );
    due = result.rows[0] ?? null;
    if (!due) {
      await client.query("COMMIT");
      return "skipped";
    }

    const escalatedAlready = await client.query(
      `SELECT 1
       FROM leave_request_assignees
       WHERE leave_request_id = $1
         AND assignment_type = 'escalation'`,
      [id],
    );
    if (due.auto_approve_due) {
      await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
        due.company_id,
        due.employee_user_id,
      ]);
      const applied = await applyApprovedLeaveToBalance(
        due.employee_user_id,
        due.company_id,
        due.leave_type_id,
        Number(due.working_days_count),
        client,
      );
      if (!applied) {
        throw new Error(
          `Remaining balance is insufficient for auto-approval of leave request ${id}`,
        );
      }
      const update = await client.query(
        `UPDATE leave_requests
         SET status = 'approved',
             reviewer_user_id = NULL,
             reviewed_at = NOW(),
             decision_reason = $2
         WHERE id = $1
           AND company_id = $3
           AND status = 'pending'`,
        [id, AUTO_APPROVE_REASON, due.company_id],
      );
      if (update.rowCount !== 1) {
        throw new Error(`Pending leave request ${id} could not be auto-approved`);
      }
      outcome = "approved";
    } else if (
      due.escalation_due &&
      escalatedAlready.rows.length === 0
    ) {
      reviewer = await findEscalationReviewer(due, client);
      if (!reviewer) {
        throw new Error(
          `No eligible same-company manager or company admin is available for leave request ${id}`,
        );
      }
      const assignment = await client.query(
        `INSERT INTO leave_request_assignees (
           leave_request_id, company_id, user_id, assignment_type
         )
         VALUES ($1, $2, $3, 'escalation')
         ON CONFLICT DO NOTHING`,
        [id, due.company_id, reviewer.id],
      );
      if (assignment.rowCount === 1) outcome = "escalated";
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!due) return "skipped";
  if (outcome === "approved") {
    await sendMail({
      to: due.employee_email,
      ...leaveDecision({
        requestId: due.id,
        requesterName: due.employee_name,
        status: "approved",
        leaveTypeName: due.leave_type,
        startDate: due.start_date,
        endDate: due.end_date,
        workingDaysCount: Number(due.working_days_count),
        decisionReason: AUTO_APPROVE_REASON,
        actionUrl: new URL(`/leave/${due.id}`, appOrigin()).toString(),
      }),
    });
  } else if (outcome === "escalated" && reviewer) {
    await sendMail({
      to: reviewer.email,
      ...leaveEscalated({
        requestId: due.id,
        reviewerName: reviewer.name,
        requesterName: due.employee_name,
        leaveTypeName: due.leave_type,
        startDate: due.start_date,
        endDate: due.end_date,
        workingDaysCount: Number(due.working_days_count),
        actionUrl: new URL(`/team/queue/${due.id}`, appOrigin()).toString(),
      }),
    });
  }
  return outcome;
}

export async function runDueLeaveEscalations(
  companyId?: number,
): Promise<EscalationRunResult> {
  const candidates = await pool.query<{ id: number }>(
    `SELECT lr.id
     FROM leave_requests AS lr
     JOIN company_leave_rules AS rules
       ON rules.company_id = lr.company_id
     WHERE lr.status = 'pending'
       AND ($1::INTEGER IS NULL OR lr.company_id = $1)
       AND (
         (
           rules.auto_approve_after_hours > 0
           AND NOW() >= lr.submitted_at
             + rules.auto_approve_after_hours::DOUBLE PRECISION * INTERVAL '1 hour'
         )
         OR (
           rules.escalate_after_hours > 0
           AND NOW() >= lr.submitted_at
             + rules.escalate_after_hours::DOUBLE PRECISION * INTERVAL '1 hour'
           AND NOT EXISTS (
             SELECT 1
             FROM leave_request_assignees
             WHERE leave_request_id = lr.id
               AND assignment_type = 'escalation'
           )
         )
       )
     ORDER BY lr.submitted_at, lr.id`,
    [companyId ?? null],
  );
  const result: EscalationRunResult = {
    escalated: 0,
    autoApproved: 0,
    skipped: 0,
    errors: [],
  };

  for (const candidate of candidates.rows) {
    try {
      const outcome = await processRequest(candidate.id, companyId);
      if (outcome === "escalated") result.escalated += 1;
      else if (outcome === "approved") result.autoApproved += 1;
      else result.skipped += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown escalation error";
      result.errors.push(`Leave request ${candidate.id}: ${message}`);
      console.error("Leave escalation failed", {
        requestId: candidate.id,
        message,
      });
    }
  }
  return result;
}
