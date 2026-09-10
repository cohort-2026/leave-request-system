import "./load-env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { pingRouter } from "./routes/ping.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Public on purpose: GET /api/health, POST /api/auth/register (not yet
// implemented), POST /api/auth/login. See docs/auth-roles.md.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/ping", pingRouter);

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
