import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const pingRouter = Router();

pingRouter.get("/signed-in", requireAuth, (req, res) => {
  res.json({ ok: true, userId: req.user!.id, role: req.user!.role });
});

pingRouter.get(
  "/admin",
  requireAuth,
  requireRole("company_admin", "platform"),
  (req, res) => {
    res.json({ ok: true, userId: req.user!.id, role: req.user!.role });
  },
);
