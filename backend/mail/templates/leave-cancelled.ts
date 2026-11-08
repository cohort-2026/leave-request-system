import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

type LeaveCancelledInput = {
  requestId: number;
  reviewerName: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  actionUrl: string;
};

export function leaveCancelled(input: LeaveCancelledInput): MailContent {
  const dateRange =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} to ${input.endDate}`;

  return emailLayout({
    subject: `Leave request #${input.requestId} was cancelled`,
    heading: "A leave request was cancelled",
    body: `${input.requesterName} cancelled their ${input.leaveTypeName} leave request for ${dateRange}.`,
    actionLabel: "View team queue",
    actionUrl: input.actionUrl,
    footer: `Hello ${input.reviewerName}, this request no longer needs a decision.`,
  });
}
