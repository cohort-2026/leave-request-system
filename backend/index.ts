import app from "./app.mjs";
import { runDueLeaveEscalations } from "./leave/escalation.js";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

const escalationInterval = setInterval(() => {
  runDueLeaveEscalations().catch((error: unknown) => {
    console.error("Scheduled leave escalation run failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  });
}, 60_000);
escalationInterval.unref();

runDueLeaveEscalations().catch((error: unknown) => {
  console.error("Initial leave escalation run failed", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
});
