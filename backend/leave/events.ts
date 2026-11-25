import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

export type LeaveEventType =
  | "submit"
  | "edit"
  | "approve"
  | "decline"
  | "withdraw"
  | "cancel"
  | "auto_approve"
  | "document_view";

export const ACTION_BY_TYPE: Record<LeaveEventType, string> = {
  submit: "submitted",
  edit: "edited",
  approve: "approved",
  decline: "declined",
  withdraw: "withdrawn",
  cancel: "cancelled",
  auto_approve: "auto_approved",
  document_view: "document_viewed",
};

export const TYPE_BY_ACTION: Record<string, LeaveEventType> = {
  submitted: "submit",
  edited: "edit",
  approved: "approve",
  declined: "decline",
  withdrawn: "withdraw",
  cancelled: "cancel",
  auto_approved: "auto_approve",
  document_viewed: "document_view",
};

export interface RecordEventInput {
  companyId: number;
  leaveRequestId: number;
  actorUserId: number;
  type: LeaveEventType;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  balanceDelta?: number | null;
}

export type PublicLeaveEvent = {
  id: string;
  type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  balanceDelta: number | null;
  createdAt: Date;
  actorUserId: number;
  actorName: string;
};

type StoredEventRow = {
  id: number;
  action: string;
  details: Record<string, unknown> | null;
  created_at: Date;
  actor_user_id: number;
  actor_name: string;
};

function statusOf(
  value: Record<string, unknown> | null | undefined,
): string | null {
  const status = value?.status;
  return typeof status === "string" ? status : null;
}

export function toPublicLeaveEvent(row: StoredEventRow): PublicLeaveEvent {
  const details = row.details ?? {};
  const before =
    details.before && typeof details.before === "object"
      ? (details.before as Record<string, unknown>)
      : null;
  const after =
    details.after && typeof details.after === "object"
      ? (details.after as Record<string, unknown>)
      : null;
  const rawDelta = details.balanceDelta;
  return {
    id: String(row.id),
    type: TYPE_BY_ACTION[row.action] ?? row.action,
    before,
    after,
    balanceDelta: typeof rawDelta === "number" ? rawDelta : null,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
  };
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

  const details: Record<string, unknown> = {};
  if (before) details.before = before;
  if (after) details.after = after;
  if (balanceDelta != null) details.balanceDelta = balanceDelta;

  await executor.query(
    `INSERT INTO leave_request_events (
       company_id,
       leave_request_id,
       actor_user_id,
       action,
       from_status,
       to_status,
       details
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      companyId,
      leaveRequestId,
      actorUserId,
      ACTION_BY_TYPE[type],
      statusOf(before),
      statusOf(after),
      Object.keys(details).length > 0 ? JSON.stringify(details) : null,
    ],
  );
}

export async function listLeaveRequestEvents(
  executor: Queryable,
  companyId: number,
  leaveRequestId: number,
): Promise<PublicLeaveEvent[]> {
  const result = await executor.query<StoredEventRow>(
    `SELECT
       e.id,
       e.action,
       e.details,
       e.created_at,
       e.actor_user_id,
       COALESCE(u.display_name, u.email) AS actor_name
     FROM leave_request_events e
     JOIN users u ON u.id = e.actor_user_id
     WHERE e.company_id = $1
       AND e.leave_request_id = $2
     ORDER BY e.created_at ASC, e.id ASC`,
    [companyId, leaveRequestId],
  );
  return result.rows.map(toPublicLeaveEvent);
}
