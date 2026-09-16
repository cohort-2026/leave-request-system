import { escapeHtml } from "../html.js";
import type { MailContent } from "../types.js";

export function verifyEmail(input: { verifyUrl: string }): MailContent {
  const url = input.verifyUrl;
  return {
    subject: "Verify your Leave Request System email",
    text: [
      "Verify your email to sign in to the Leave Request System.",
      "",
      url,
      "",
      "This link expires in 24 hours. If you did not register, ignore this message.",
    ].join("\n"),
    html: [
      "<p>Verify your email to sign in to the Leave Request System.</p>",
      `<p><a href="${escapeHtml(url)}">Verify email</a></p>`,
      "<p>This link expires in 24 hours. If you did not register, ignore this message.</p>",
    ].join(""),
  };
}
