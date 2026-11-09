import "../load-env.js";
import { sendMail, testMessage } from "../mail/index.js";

const to = process.argv[2]?.trim();
if (!to) {
  throw new Error(
    "Pass an authorized recipient address: npm run mail:test -- <email>",
  );
}

await sendMail({ to, ...testMessage() });
console.log(`Test email sent to ${to}.`);
if (
  !process.env.SMTP_HOST ||
  ["127.0.0.1", "localhost"].includes(process.env.SMTP_HOST.trim())
) {
  console.log("Open http://localhost:8025 to view it in Mailpit.");
}
