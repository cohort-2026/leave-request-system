import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

// Example routes for 4.2, so there's something to hit that exercises the
// checkpoints. Route names are placeholders — rename to match the Monday
// contract once it's settled; the important part is which middleware runs.
export const pingRouter = Router();

// Signed-in ping: any signed-in person, any role.
pingRouter.get("/signed-in", requireAuth, (req, res) => {
  res.json({ ok: true, userId: req.user!.id, role: req.user!.role });
});

// Admin ping: company_admin only. Add "platform" here too if the Monday
// contract says platform should also reach admin-only routes.
pingRouter.get("/admin", requireAuth, requireRole("company_admin"), (req, res) => {
  res.json({ ok: true, userId: req.user!.id, role: req.user!.role });
});
