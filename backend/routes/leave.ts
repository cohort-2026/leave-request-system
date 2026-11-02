import { Router } from "express";
import { pool } from "../db.js";
import { listBalances } from "../leave/balances.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireCompanyId, sameCompanyId } from "../tenancy.js";

export const leaveRouter = Router();
export const userBalancesRouter = Router();

leaveRouter.get(
  "/balances",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const balances = await listBalances(req.user!.id, companyId);
    res.json({ balances });
  },
);

userBalancesRouter.get(
  "/:id/balances",
  requireAuth,
  requireRole("staff", "manager", "company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) {
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    const found = await pool.query<{
      id: number;
      company_id: number | null;
    }>(
      `SELECT id, company_id
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    const target = found.rows[0];
    if (!target) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const actor = req.user!;
    const isSelf = actor.id === target.id;
    const isSameCompanyManager =
      (actor.role === "manager" || actor.role === "company_admin") &&
      sameCompanyId(companyId, target.company_id);
    if (!isSelf && !isSameCompanyManager) {
      res.status(403).json({ error: "You are not allowed to do that" });
      return;
    }

    const balances = await listBalances(target.id, companyId);
    res.json({ balances });
  },
);
