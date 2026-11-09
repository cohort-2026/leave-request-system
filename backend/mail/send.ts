import { smtpConfig } from "./config.js";
import { getTransport } from "./transport.js";
import type { MailContent } from "./types.js";

export type SendMailInput = MailContent & {
  to: string;
};

function errorProperty(error: unknown, key: string): unknown {
  if (typeof error !== "object" || error === null || !(key in error)) {
    return undefined;
  }
  return Reflect.get(error, key);
}

export async function sendMail(input: SendMailInput): Promise<void> {
  const to = input.to.trim();
  if (!to) {
    throw new Error("Mail recipient is missing");
  }

  const config = smtpConfig();
  try {
    await getTransport().sendMail({
      from: config.from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown mail error";
    const sanitizedMessage = [config.user, config.pass]
      .filter(Boolean)
      .reduce(
        (value, secret) => value.replaceAll(secret, "[redacted]"),
        message,
      );
    console.error("Mail send failed", {
      host: config.host,
      port: config.port,
      secure: config.secure,
      name: errorProperty(err, "name"),
      code: errorProperty(err, "code"),
      command: errorProperty(err, "command"),
      responseCode: errorProperty(err, "responseCode"),
      message: sanitizedMessage,
    });
    throw err;
  }
}
