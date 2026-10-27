import { Router } from "express";
import { publicPlans, VAT_NOTE, VAT_RATE_BP, CURRENCY } from "../billing/catalog.js";

export const billingRouter = Router();

billingRouter.get("/plans", (_req, res) => {
  res.json({
    plans: publicPlans(),
    currency: CURRENCY,
    vatRateBp: VAT_RATE_BP,
    vatNote: VAT_NOTE,
  });
});
