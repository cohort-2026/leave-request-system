import { escapeHtml } from "../html.js";

type EmailLayoutInput = {
  preheader: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  expiry: string;
};

export function emailLayout(input: EmailLayoutInput): string {
  const preheader = escapeHtml(input.preheader);
  const heading = escapeHtml(input.heading);
  const message = escapeHtml(input.message);
  const actionLabel = escapeHtml(input.actionLabel);
  const actionUrl = escapeHtml(input.actionUrl);
  const expiry = escapeHtml(input.expiry);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#202735;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f3f5f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e6ed;border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 12px;font-size:15px;font-weight:bold;letter-spacing:0.2px;color:#2c3e6b;">
                Leave Request
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#202735;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 20px;font-size:16px;line-height:1.6;color:#4a5362;">
                ${message}
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:0 32px 24px;">
                <a href="${actionUrl}" style="display:inline-block;padding:13px 22px;border-radius:6px;background-color:#2c3e6b;color:#ffffff;font-size:16px;line-height:1.2;font-weight:bold;text-decoration:none;">${actionLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 20px;font-size:14px;line-height:1.6;color:#596273;">
                This link expires in ${expiry}. If you did not request this, you can ignore this email.
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;font-size:13px;line-height:1.6;color:#596273;word-break:break-word;">
                If the button does not work, copy and paste this link into your browser:<br>
                <a href="${actionUrl}" style="color:#2c3e6b;text-decoration:underline;">${actionUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid #e8ebf0;font-size:12px;line-height:1.5;color:#737c8b;">
                Leave Request System - This is an automated message; please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
