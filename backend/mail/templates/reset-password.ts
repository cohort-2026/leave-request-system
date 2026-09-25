import { escapeHtml } from "../html.js";
import type { MailContent } from "../types.js";

export function resetPasswordEmail(input: { resetUrl: string }): MailContent {
  const url = input.resetUrl;
  return {
    subject: "Reset your Leave Request System password",
    text: [
      "Reset your password for the Leave Request System.",
      "",
      url,
      "",
      "This link expires in 1 hour. If you did not request a reset, ignore this message.",
    ].join("\n"),
    html: [
      "<p>Reset your password for the Leave Request System.</p>",
      `<p><a href="${escapeHtml(url)}">Reset password</a></p>`,
      "<p>This link expires in 1 hour. If you did not request a reset, ignore this message.</p>",
    ].join(""),
  };
}
