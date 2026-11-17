import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

export type LeaveEventType =
  | "submit"
  | "edit"
  | "approve"
  | "decline"
  | "withdraw"
  | "auto_approve"
  | "document_view";

export interface RecordEventInput {
  companyId: number;
  leaveRequestId: number;
  actorUserId: number;
  type: LeaveEventType;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  balanceDelta?: number | null;
}

export async function recordEvent(
  executor: Queryable,
  input: RecordEventInput,
): Promise<void> {
  const {
    companyId,
    leaveRequestId,
    actorUserId,
    type,
    before = null,
    after = null,
    balanceDelta = null,
  } = input;

  await executor.query(
    `INSERT INTO leave_events (
       company_id,
       leave_request_id,
       actor_user_id,
       event_type,
       before_state,
       after_state,
       balance_delta
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [
      companyId,
      leaveRequestId,
      actorUserId,
      type,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      balanceDelta,
    ],
  );
}
