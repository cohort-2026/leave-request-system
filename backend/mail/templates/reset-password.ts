import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";

export function resetPasswordEmail(input: { resetUrl: string }): MailContent {
  return emailLayout({
    subject: "Reset your Leave Request System password",
    heading: "Reset your password",
    body: "Use the button below to choose a new password for your Leave Request System account.",
    actionLabel: "Reset password",
    actionUrl: input.resetUrl,
    footer:
      "This link expires in 1 hour. If you did not request a password reset, you can ignore this email.",
  });
}
