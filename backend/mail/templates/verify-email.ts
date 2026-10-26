import type { MailContent } from "../types.js";
import { emailLayout } from "./email-layout.js";

export function verifyEmail(input: { verifyUrl: string }): MailContent {
  const url = input.verifyUrl;
  const message =
    "Verify your email address to finish setting up your account and sign in.";
  const expiry = "24 hours";
  return {
    subject: "Verify your email | Leave Request System",
    text: [
      message,
      "",
      url,
      "",
      `This link expires in ${expiry}. If you did not register, you can ignore this email.`,
      "",
      "Leave Request System",
    ].join("\n"),
    html: emailLayout({
      preheader: "Verify your email address to finish setting up your account.",
      heading: "Verify your email",
      message,
      actionLabel: "Verify email",
      actionUrl: url,
      expiry,
    }),
  };
}
