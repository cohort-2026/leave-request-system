import { escapeHtml } from "../html.js";
import type { MailContent } from "../types.js";

export function loginOtp(input: { code: string }): MailContent {
  const code = input.code;
  return {
    subject: "Your Leave Request System sign-in code",
    text: [
      "Use this code to finish signing in to the Leave Request System.",
      "",
      code,
      "",
      "This code expires in 10 minutes. If you did not try to sign in, ignore this message.",
    ].join("\n"),
    html: [
      "<p>Use this code to finish signing in to the Leave Request System.</p>",
      `<p><strong>${escapeHtml(code)}</strong></p>`,
      "<p>This code expires in 10 minutes. If you did not try to sign in, ignore this message.</p>",
    ].join(""),
  };
}
