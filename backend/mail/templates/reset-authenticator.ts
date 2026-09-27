import { escapeHtml } from "../html.js";
import type { MailContent } from "../types.js";

export function resetAuthenticatorEmail(input: {
  resetUrl: string;
}): MailContent {
  const url = input.resetUrl;
  return {
    subject: "Reset your Leave Request System authenticator",
    text: [
      "Reset the Google Authenticator (or TOTP app) for your Leave Request System account.",
      "",
      url,
      "",
      "This link expires in 1 hour. If you did not request this, ignore this message. Your authenticator stays in place until you open the link.",
    ].join("\n"),
    html: [
      "<p>Reset the Google Authenticator (or TOTP app) for your Leave Request System account.</p>",
      `<p><a href="${escapeHtml(url)}">Reset authenticator</a></p>`,
      "<p>This link expires in 1 hour. If you did not request this, ignore this message. Your authenticator stays in place until you open the link.</p>",
    ].join(""),
  };
}
