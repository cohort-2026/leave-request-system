export type LeaveReviewEvent = {
  type: "submitted" | "approved" | "rejected" | "cancelled";
  at: Date;
  actorName: string | null;
  reason: string | null;
};

export type LeaveReviewEventSource = {
  status: string;
  submitted_at: Date;
  employee_name: string;
  reviewed_at: Date | null;
  reviewer_name: string | null;
  decision_reason: string | null;
  cancelled_at: Date | null;
};

export function buildLeaveReviewEvents(
  request: LeaveReviewEventSource,
): LeaveReviewEvent[] {
  const events: LeaveReviewEvent[] = [
    {
      type: "submitted",
      at: request.submitted_at,
      actorName: request.employee_name,
      reason: null,
    },
  ];

  if (
    (request.status === "approved" || request.status === "rejected") &&
    request.reviewed_at
  ) {
    events.push({
      type: request.status,
      at: request.reviewed_at,
      actorName: request.reviewer_name,
      reason: request.decision_reason,
    });
  }

  if (request.status === "cancelled" && request.cancelled_at) {
    events.push({
      type: "cancelled",
      at: request.cancelled_at,
      actorName: null,
      reason: null,
    });
  }

  return events.sort((left, right) => left.at.getTime() - right.at.getTime());
}
