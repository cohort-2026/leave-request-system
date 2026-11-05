import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

type LeaveSubmittedInput = {
  requestId: number;
  reviewerName: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDaysCount: number;
  actionUrl: string;
};

export function leaveSubmitted(input: LeaveSubmittedInput): MailContent {
  const dateRange =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} to ${input.endDate}`;

  return emailLayout({
    subject: `Leave request #${input.requestId} needs review`,
    heading: "A leave request needs your review",
    body: `${input.requesterName} submitted a ${input.leaveTypeName} leave request for ${dateRange} (${input.workingDaysCount} working days).`,
    actionLabel: "Review request",
    actionUrl: input.actionUrl,
    footer: `Hello ${input.reviewerName}, please review this request in your company leave queue.`,
  });
}
