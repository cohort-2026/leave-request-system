import { smtpConfig } from "./config.js";
import { getTransport } from "./transport.js";
import type { MailContent } from "./types.js";

export type SendMailInput = MailContent & {
  to: string;
};

export async function sendMail(input: SendMailInput): Promise<void> {
  const to = input.to.trim();
  if (!to) {
    throw new Error("Mail recipient is missing");
  }

  try {
    await getTransport().sendMail({
      from: smtpConfig().from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Mail send failed: ${message}`);
    throw err;
  }
}
