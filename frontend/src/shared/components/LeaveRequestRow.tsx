// frontend/src/shared/components/LeaveRequestRow.tsx
//
// Shared row shape used by both "my leave" (/leave) and "team queue"
// (/team/queue) — they show the same request data, just with different
// actions available (an employee can't approve their own request).
//
// This renders <td> cells only (no <tr>) because it's meant to be passed
// into DataTable's `renderRow` slot, which supplies the <tr> wrapper.
// It does not fetch leave data — everything comes in as props/callbacks.

import type { LeaveRequestSummary } from "./types";
// From Member 4.1 (not this barrel, to avoid a circular import) — confirm
// this filename once that branch is merged; it may be StatusBadge.tsx.
import { StatusBadge } from "./StatusBadge";

export interface LeaveRequestRowProps {
  request: LeaveRequestSummary;
  /** Show approve/reject actions (team queue). Omit for read-only lists. */
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
  variant?: string;
}

export function LeaveRequestRow({
  request,
  onApprove,
  onReject,
  onView,
  className,
  variant,
}: LeaveRequestRowProps) {
  return (
    <>
      <td className={className} data-variant={variant}>
        {request.requesterName}
      </td>
      <td>{request.leaveType}</td>
      <td>
        {request.startDate} – {request.endDate}
      </td>
      <td>
        <StatusBadge status={request.status} />
      </td>
      <td>
        {onView && (
          <button onClick={() => onView(request.id)}>View</button>
        )}
        {onApprove && request.status === "pending" && (
          <button onClick={() => onApprove(request.id)}>Approve</button>
        )}
        {onReject && request.status === "pending" && (
          <button onClick={() => onReject(request.id)}>Reject</button>
        )}
      </td>
    </>
  );
}
