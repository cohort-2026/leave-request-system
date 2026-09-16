import "../load-env.js";
import { sendMail, testMessage } from "../mail/index.js";

const to = process.argv[2]?.trim() || "mailer-test@leave.local";

await sendMail({ to, ...testMessage() });
console.log("Test email sent. Open http://localhost:8025 to view it.");
