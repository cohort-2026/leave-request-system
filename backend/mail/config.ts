export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user: string;
  pass: string;
};

// Missing values fall back to local Mailpit: SMTP 127.0.0.1:1025, no TLS, no auth.
export function smtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === "true",
    from:
      process.env.MAIL_FROM?.trim() ||
      "Leave Request System <noreply@leave.local>",
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS ?? "",
  };
}
