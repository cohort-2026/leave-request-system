import type { MailContent } from "../types.js";

export function testMessage(): MailContent {
  return {
    subject: "Leave Request System mailer test",
    text: [
      "This is a test message from the Leave Request System mailer.",
      "If you can read this in Mailpit, SMTP is wired correctly.",
    ].join("\n"),
    html: [
      "<p>This is a test message from the Leave Request System mailer.</p>",
      "<p>If you can read this in Mailpit, SMTP is wired correctly.</p>",
    ].join(""),
  };
}
