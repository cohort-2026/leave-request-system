import "./load-env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { billingRouter } from "./routes/billing.js";
import { companiesRouter } from "./routes/companies.js";
import {
  leaveRouter,
  teamRouter,
  userBalancesRouter,
} from "./routes/leave.js";
import {
  adminLeaveTypesRouter,
  leaveTypesRouter,
} from "./routes/leave-types.js";
import { calendarRouter } from "./routes/calendar.js";
import { pingRouter } from "./routes/ping.js";
import { usersRouter } from "./routes/users.js";
import { authSsoRouter, companySsoRouter } from "./routes/sso.js";
import { escalationsRouter } from "./routes/escalations.js";

const app = express();

app.use(
  cors({
    origin: process.env.APP_ORIGIN?.trim() || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/billing", billingRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/companies", companySsoRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/team", teamRouter);
app.use("/api/leave-types", leaveTypesRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/admin/leave-types", adminLeaveTypesRouter);
app.use("/api/ping", pingRouter);
app.use("/api/users", userBalancesRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authSsoRouter);
app.use("/api/dev", escalationsRouter);

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

export default app;
