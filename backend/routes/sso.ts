import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCompanyId } from "../tenancy.js";
import { getMockOidcAuthorizeUrl, exchangeMockOidcCodeForUser } from "../auth/mockOidc.js";

export const ssoRouter = Router();

ssoRouter.get(
  "/companies/current/sso",
  requireAuth,
  requireCompanyId,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user.role !== "company_admin") {
        return res.status(403).json({ error: "Forbidden: Company admins only" });
      }

      const result = await pool.query(
        `SELECT issuer, client_id as "clientId", email_domain as "emailDomain", enabled
         FROM company_oidc_settings
         WHERE company_id = $1 LIMIT 1`,
        [req.companyId]
      );

      if (result.rowCount === 0) {
        return res.json({ issuer: null, clientId: null, emailDomain: null, enabled: false });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

ssoRouter.put(
  "/companies/current/sso",
  requireAuth,
  requireCompanyId,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user.role !== "company_admin") {
        return res.status(403).json({ error: "Forbidden: Company admins only" });
      }

      const { issuer, clientId, clientSecret, emailDomain, enabled } = req.body;

      if (!issuer || !clientId || !clientSecret || !emailDomain) {
        return res.status(400).json({ error: "Bad Request: Missing required parameters" });
      }

      await pool.query(
        `INSERT INTO company_oidc_settings (company_id, issuer, client_id, client_secret, email_domain, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (company_id) DO UPDATE
         SET issuer = EXCLUDED.issuer,
             client_id = EXCLUDED.client_id,
             client_secret = EXCLUDED.client_secret,
             email_domain = EXCLUDED.email_domain,
             enabled = EXCLUDED.enabled,
             updated_at = NOW()`,
        [req.companyId, issuer.trim(), clientId.trim(), clientSecret.trim(), emailDomain.trim().toLowerCase(), !!enabled]
      );

      return res.json({ message: "SSO settings updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);

ssoRouter.get(
  "/auth/sso/start",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyIdentifier = req.query.company as string;
      if (!companyIdentifier) {
        return res.status(400).json({ error: "Bad Request: Company identity value required" });
      }

      const settingsResult = await pool.query(
        `SELECT s.* FROM company_oidc_settings s
         JOIN companies c ON s.company_id = c.id
         WHERE (c.slug = $1 OR s.email_domain = $1) AND s.enabled = true LIMIT 1`,
        [companyIdentifier.trim().toLowerCase()]
      );

      const settings = settingsResult.rows[0];
      if (!settings) {
        return res.status(400).json({ error: "SSO is not configured or enabled for this provider" });
      }

      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/sso/callback`;
      const authorizeUrl = getMockOidcAuthorizeUrl(
        settings.issuer,
        settings.client_id,
        redirectUri,
        `state_company_${settings.company_id}`
      );

      return res.redirect(authorizeUrl);
    } catch (error) {
      next(error);
    }
  }
);

ssoRouter.get(
  "/auth/sso/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = req.query;
      if (!code || !state || typeof state !== "string") {
        return res.status(400).json({ error: "Invalid callback assertions" });
      }

      const companyIdMatch = state.match(/state_company_(\d+)/);
      if (!companyIdMatch) {
        return res.status(400).json({ error: "Invalid state signature" });
      }
      const companyId = parseInt(companyIdMatch[1], 10);

      const ssoUser = exchangeMockOidcCodeForUser(code as string);
      const userEmail = ssoUser.email.toLowerCase();

      const settingsResult = await pool.query(
        `SELECT email_domain FROM company_oidc_settings WHERE company_id = $1 AND enabled = true`,
        [companyId]
      );
      if (settingsResult.rowCount === 0 || !userEmail.endsWith(`@${settingsResult.rows[0].email_domain}`)) {
        return res.status(403).json({ error: "Forbidden: Callback context mismatch" });
      }

      const userResult = await pool.query(
        `SELECT id, status FROM users WHERE email = $1 AND company_id = $2 LIMIT 1`,
        [userEmail, companyId]
      );

      const user = userResult.rows[0];
      if (!user) {
        return res.status(403).json({ error: "Ask your admin to provision your account." });
      }
      if (user.status !== "active") {
        return res.status(403).json({ error: "Account status is inactive." });
      }

      const sessionId = randomUUID();
      await pool.query(
        `INSERT INTO user_sessions (id, user_id, created_at, expires_at)
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '7 days')`,
        [sessionId, user.id]
      );

      res.cookie("lrs_session", sessionId, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return res.redirect("http://localhost:5173/");
    } catch (error) {
      next(error);
    }
  }
);
