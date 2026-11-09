export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user: string;
  pass: string;
};

export function smtpConfig(): SmtpConfig {
  const production = process.env.NODE_ENV === "production";
  const host = process.env.SMTP_HOST?.trim() || (production ? "" : "127.0.0.1");
  const port = Number(process.env.SMTP_PORT) || (production ? 0 : 1025);
  const from =
    process.env.MAIL_FROM?.trim() ||
    (production ? "" : "Leave Request System <noreply@leave.local>");
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS ?? "";

  if (production && (!host || !port || !from || !user || !pass)) {
    throw new Error(
      "Production email requires SMTP_HOST, SMTP_PORT, MAIL_FROM, SMTP_USER, and SMTP_PASS.",
    );
  }
  if (production && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }
  if (production && !process.env.APP_ORIGIN?.trim()) {
    throw new Error("APP_ORIGIN must be set in production.");
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    from,
    user,
    pass,
  };
}

export function appOrigin(): string {
  const origin = process.env.APP_ORIGIN?.trim();
  if (!origin && process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN must be set in production.");
  }
  return origin || "http://localhost:5173";
}
