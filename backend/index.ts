import "./load-env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { billingRouter } from "./routes/billing.js";
import { companiesRouter } from "./routes/companies.js";
import { leaveRouter } from "./routes/leave.js";
import { pingRouter } from "./routes/ping.js";
import { usersRouter } from "./routes/users.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Named origin + credentials: true is required for the cookie between
// :5173 and :4000. origin: "*" (or omitting credentials) makes the browser
// drop Set-Cookie and refuse to send lrs_session back.
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/billing", billingRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/ping", pingRouter);
app.use("/api/users", usersRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
    console.error(err instanceof Error ? err.message : "Unknown error");
    res.status(500).json({ error: "Something went wrong" });
  },
);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

