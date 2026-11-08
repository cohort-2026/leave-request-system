import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

type LeaveDecisionInput = {
  requestId: number;
  requesterName: string;
  status: "approved" | "rejected";
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDaysCount: number;
  decisionReason?: string | null;
  actionUrl: string;
};

export function leaveDecision(input: LeaveDecisionInput): MailContent {
  const isApproved = input.status === "approved";
  const dateRange =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} to ${input.endDate}`;
  const reasonLine =
    !isApproved && input.decisionReason
      ? ` Reason: ${input.decisionReason}`
      : "";

  return emailLayout({
    subject: `Leave request #${input.requestId} was ${input.status}`,
    heading: isApproved
      ? "Your leave request was approved"
      : "Your leave request was rejected",
    body: `Hello ${input.requesterName}, your ${input.leaveTypeName} leave request for ${dateRange} (${input.workingDaysCount} working days) was ${input.status}.${reasonLine}`,
    actionLabel: "View request",
    actionUrl: input.actionUrl,
    footer: "Leave Request System",
  });
}
