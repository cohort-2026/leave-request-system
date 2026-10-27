import type { MailContent } from "../types.js";
import { emailLayout } from "./email-layout.js";

export function resetPasswordEmail(input: { resetUrl: string }): MailContent {
  const url = input.resetUrl;
  const message =
    "Use the button below to choose a new password for your account.";
  const expiry = "1 hour";
  return {
    subject: "Reset your password | Leave Request System",
    text: [
      message,
      "",
      url,
      "",
      `This link expires in ${expiry}. If you did not request a reset, you can ignore this email.`,
      "",
      "Leave Request System",
    ].join("\n"),
    html: emailLayout({
      preheader:
        "Use the secure link to reset your Leave Request System password.",
      heading: "Reset your password",
      message,
      actionLabel: "Reset password",
      actionUrl: url,
      expiry,
    }),
  };
}
