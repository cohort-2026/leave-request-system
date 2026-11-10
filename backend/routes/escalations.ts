import { Router } from "express";
import { runDueLeaveEscalations } from "../leave/escalation.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId } from "../tenancy.js";

export const escalationsRouter = Router();

escalationsRouter.post(
  "/run-leave-escalations",
  (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    next();
  },
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const result = await runDueLeaveEscalations(companyId);
    res.status(result.errors.length > 0 ? 502 : 200).json(result);
  },
);
