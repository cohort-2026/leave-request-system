import { escapeHtml } from "../html.js";
import type { MailContent } from "../types.js";

type EmailLayoutInput = {
  subject: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  footer: string;
};

export function emailLayout(input: EmailLayoutInput): MailContent {
  const subject = escapeHtml(input.subject);
  const heading = escapeHtml(input.heading);
  const body = escapeHtml(input.body);
  const actionLabel = escapeHtml(input.actionLabel);
  const actionUrl = escapeHtml(input.actionUrl);
  const footer = escapeHtml(input.footer);

  return {
    subject: input.subject,
    text: [
      input.heading,
      "",
      input.body,
      "",
      `${input.actionLabel}:`,
      input.actionUrl,
      "",
      input.footer,
    ].join("\n"),
    html: [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${subject}</title>`,
      "</head>",
      '<body style="margin:0;padding:0;background-color:#f3f4f6;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">',
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background-color:#f3f4f6;">',
      "<tr>",
      '<td align="center" style="padding:32px 16px;">',
      '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:collapse;">',
      "<tr>",
      '<td style="padding:0 0 16px;font-size:14px;font-weight:bold;letter-spacing:0.04em;color:#374151;">Leave Request System</td>',
      "</tr>",
      "<tr>",
      '<td style="padding:32px 28px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">',
      `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">${heading}</h1>`,
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">${body}</p>`,
      '<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;">',
      "<tr>",
      '<td align="center" bgcolor="#1d4ed8" style="border-radius:6px;">',
      `<a href="${actionUrl}" style="display:inline-block;padding:12px 20px;border:1px solid #1d4ed8;border-radius:6px;background-color:#1d4ed8;color:#ffffff;font-size:16px;font-weight:bold;line-height:1.25;text-decoration:none;">${actionLabel}</a>`,
      "</td>",
      "</tr>",
      "</table>",
      `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">${footer}</p>`,
      "</td>",
      "</tr>",
      "<tr>",
      '<td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.5;color:#6b7280;">This is an automated message from the Leave Request System.</td>',
      "</tr>",
      "</table>",
      "</td>",
      "</tr>",
      "</table>",
      "</body>",
      "</html>",
    ].join(""),
  };
}
