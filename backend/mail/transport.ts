import { createTransport, type Transporter } from "nodemailer";
import { smtpConfig } from "./config.js";

let transporter: Transporter | null = null;

export function getTransport(): Transporter {
  if (transporter) {
    return transporter;
  }

  const cfg = smtpConfig();
  transporter = createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return transporter;
}
