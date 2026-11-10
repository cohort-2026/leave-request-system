import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

type LeaveEscalatedInput = {
  requestId: number;
  reviewerName: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDaysCount: number;
  actionUrl: string;
};

export function leaveEscalated(input: LeaveEscalatedInput): MailContent {
  const dateRange =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} to ${input.endDate}`;

  return emailLayout({
    subject: `Escalated leave request #${input.requestId} needs review`,
    heading: "A leave request was escalated to you",
    body: `${input.requesterName} submitted a ${input.leaveTypeName} leave request for ${dateRange} (${input.workingDaysCount} working days). The original reviewer has not decided yet, so you may approve or reject it.`,
    actionLabel: "Review request",
    actionUrl: input.actionUrl,
    footer: `Hello ${input.reviewerName}, please review this request in your company leave queue.`,
  });
}
