import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

type LeaveDocumentReminderInput = {
  requestId: number;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDaysCount: number;
  actionUrl: string;
};

export function leaveDocumentReminder(
  input: LeaveDocumentReminderInput,
): MailContent {
  const dateRange =
    input.startDate === input.endDate
      ? input.startDate
      : `${input.startDate} to ${input.endDate}`;

  return emailLayout({
    subject: `Attach your sick note for leave request #${input.requestId}`,
    heading: "Please attach your sick note",
    body: `Hello ${input.requesterName}, your ${input.leaveTypeName} leave request for ${dateRange} (${input.workingDaysCount} working days) was submitted without a medical document. Attach the sick note so a reviewer can decide.`,
    actionLabel: "Upload sick note",
    actionUrl: input.actionUrl,
    footer: "Leave Request System",
  });
}
