import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

type LeaveCancelledInput = {
  requestId: number;
  reviewerName: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  wasApproved?: boolean;
  reason?: string | null;
  actionUrl: string;
};

export function leaveCancelled(input: LeaveCancelledInput): MailContent {
  const dateRange =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} to ${input.endDate}`;

  const reason = input.reason ? ` Reason: ${input.reason}` : "";

  return emailLayout({
    subject: `Leave request #${input.requestId} was cancelled`,
    heading: "A leave request was cancelled",
    body: `${input.requesterName} cancelled their ${input.wasApproved ? "approved " : ""}${input.leaveTypeName} leave request for ${dateRange}.${reason}`,
    actionLabel: "View team queue",
    actionUrl: input.actionUrl,
    footer: input.wasApproved
      ? `Hello ${input.reviewerName}, this previously approved leave has now been cancelled.`
      : `Hello ${input.reviewerName}, this request no longer needs a decision.`,
  });
}
