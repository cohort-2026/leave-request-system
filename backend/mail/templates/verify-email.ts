import { emailLayout } from "./layout.js";
import type { MailContent } from "../types.js";
import { emailLayout } from "./email-layout.js";

export function verifyEmail(input: { verifyUrl: string }): MailContent {
  return emailLayout({
    subject: "Verify your Leave Request System email",
    heading: "Verify your email",
    body: "Confirm your email address to activate your Leave Request System account.",
    actionLabel: "Verify email",
    actionUrl: input.verifyUrl,
    footer:
      "This link expires in 24 hours. If you did not sign up, you can ignore this email.",
  });
}
