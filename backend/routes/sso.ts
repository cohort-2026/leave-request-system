import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { mockPayAllowed } from "../companies/signup.js";
import { pool } from "../db.js";
import {
  exchangeMockOidcCodeForUser,
  mockOidcCodeForEmail,
} from "../auth/mockOidc.js";
import { appOrigin } from "../mail/config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
} from "../session.js";
import { requireCompanyId } from "../tenancy.js";
import { decryptSecret, encryptSecret } from "../totp/encrypt.js";

export const companySsoRouter = Router();
export const authSsoRouter = Router();

const SSO_UNAVAILABLE = "Company SSO is not available yet.";
const MOCK_SSO_DISABLED =
  "Live identity provider sign-in is not configured yet. Development mock SSO is local only.";
const ASK_ADMIN = "Ask your admin to provision your account.";
const STATE_PURPOSE = "sso-mock";
const STATE_TTL = "10m";

type SettingsRow = {
  company_id: number;
  issuer: string;
  client_id: string;
  client_secret_cipher: string;
  email_domain: string | null;
  enabled: boolean;
};

type CompanyRow = {
  id: number;
  slug: string;
};

type SsoState = {
  companyId: number;
  email?: string;
};

function pgCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) {
    return undefined;
  }
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isSsoTableMissing(err: unknown): boolean {
  const code = pgCode(err);
  return code === "42P01" || code === "42703";
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is missing. Copy backend/.env.example to backend/.env and fill it in.",
    );
  }
  return secret;
}

function signSsoState(payload: SsoState): string {
  return jwt.sign({ ...payload, purpose: STATE_PURPOSE }, jwtSecret(), {
    expiresIn: STATE_TTL,
  });
}

function readSsoState(value: unknown): SsoState | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const payload = jwt.verify(value, jwtSecret());
    if (typeof payload !== "object" || payload === null) return null;
    const record = payload as { purpose?: unknown; companyId?: unknown; email?: unknown };
    if (record.purpose !== STATE_PURPOSE) return null;
    const companyId = Number(record.companyId);
    if (!Number.isInteger(companyId) || companyId <= 0) return null;
    const email =
      typeof record.email === "string" && record.email.includes("@")
        ? record.email.trim().toLowerCase()
        : undefined;
    return { companyId, email };
  } catch {
    return null;
  }
}

function toSettingsJson(row: SettingsRow | null) {
  if (!row) {
    return {
      issuer: "",
      clientId: "",
      emailDomain: "",
      enabled: false,
      clientSecretConfigured: false,
    };
  }
  return {
    issuer: row.issuer,
    clientId: row.client_id,
    emailDomain: row.email_domain ?? "",
    enabled: row.enabled,
    clientSecretConfigured: Boolean(row.client_secret_cipher),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mockAuthorizePage(state: string, error?: string): string {
  const errorHtml = error
    ? `<p style="color:#b42318">${escapeHtml(error)}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Company SSO (local mock)</title>
    <style>
      body { font-family: sans-serif; max-width: 28rem; margin: 3rem auto; }
      label { display: block; margin-bottom: 0.75rem; }
      input { width: 100%; padding: 0.4rem; }
      button { margin-top: 0.5rem; }
    </style>
  </head>
  <body>
    <h1>Company SSO</h1>
    <p>Local mock identity provider. Production refuses this page.</p>
    ${errorHtml}
    <form method="get">
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <label>
        Work email
        <input type="email" name="email" required autocomplete="username" />
      </label>
      <button type="submit">Continue</button>
    </form>
  </body>
</html>`;
}

async function loadSettings(
  companyId: number,
): Promise<SettingsRow | null> {
  const result = await pool.query<SettingsRow>(
    `SELECT company_id, issuer, client_id, client_secret_cipher, email_domain, enabled
     FROM company_oidc_settings
     WHERE company_id = $1
     LIMIT 1`,
    [companyId],
  );
  return result.rows[0] ?? null;
}

async function findEnabledCompany(identifier: string): Promise<CompanyRow | null> {
  const value = identifier.trim().toLowerCase();
  const email = value.includes("@") ? value : null;
  const domain = email ? email.split("@")[1] ?? null : value.replace(/^@/, "");

  const result = await pool.query<CompanyRow>(
    `SELECT c.id, c.slug
     FROM companies AS c
     JOIN company_oidc_settings AS s
       ON s.company_id = c.id
     WHERE s.enabled = TRUE
       AND (
         c.slug = $1
         OR LOWER(COALESCE(s.email_domain, '')) = $2
         OR (
           $3::text IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM users AS u
             WHERE u.company_id = c.id
               AND LOWER(u.email) = $3
           )
         )
       )
     ORDER BY c.id
     LIMIT 1`,
    [value, domain, email],
  );
  return result.rows[0] ?? null;
}

function handleSsoError(err: unknown, res: Response): boolean {
  if (isSsoTableMissing(err)) {
    res.status(503).json({ error: SSO_UNAVAILABLE });
    return true;
  }
  return false;
}

companySsoRouter.get(
  "/current/sso",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    try {
      const row = await loadSettings(companyId);
      res.json(toSettingsJson(row));
    } catch (err) {
      if (handleSsoError(err, res)) return;
      throw err;
    }
  },
);

companySsoRouter.put(
  "/current/sso",
  requireAuth,
  requireRole("company_admin"),
  async (req, res) => {
    const companyId = requireCompanyId(req.user, res);
    if (companyId === null) return;

    const issuer = asNonEmptyString(req.body?.issuer);
    const clientId = asNonEmptyString(req.body?.clientId);
    const emailDomain = asNonEmptyString(req.body?.emailDomain)?.replace(
      /^@/,
      "",
    ).toLowerCase();
    const enabled = Boolean(req.body?.enabled);
    const clientSecret = asNonEmptyString(req.body?.clientSecret);

    if (!issuer || !clientId || !emailDomain) {
      res.status(400).json({
        error: "Issuer, client id, and email domain are required",
      });
      return;
    }

    try {
      const existing = await loadSettings(companyId);
      const secretCipher = clientSecret
        ? encryptSecret(clientSecret)
        : existing?.client_secret_cipher ?? null;
      if (!secretCipher) {
        res.status(400).json({ error: "Client secret is required" });
        return;
      }
      if (enabled) {
        try {
          decryptSecret(secretCipher);
        } catch {
          res.status(400).json({ error: "Client secret is required" });
          return;
        }
      }

      const saved = await pool.query<SettingsRow>(
        `INSERT INTO company_oidc_settings (
           company_id, issuer, client_id, client_secret_cipher, email_domain, enabled, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (company_id) DO UPDATE
         SET issuer = EXCLUDED.issuer,
             client_id = EXCLUDED.client_id,
             client_secret_cipher = EXCLUDED.client_secret_cipher,
             email_domain = EXCLUDED.email_domain,
             enabled = EXCLUDED.enabled,
             updated_at = NOW()
         RETURNING company_id, issuer, client_id, client_secret_cipher, email_domain, enabled`,
        [companyId, issuer, clientId, secretCipher, emailDomain, enabled],
      );
      res.json(toSettingsJson(saved.rows[0] ?? null));
    } catch (err) {
      if (handleSsoError(err, res)) return;
      throw err;
    }
  },
);

async function startSso(identifier: string, req: Request, res: Response) {
  if (!mockPayAllowed()) {
    res.status(503).json({ error: MOCK_SSO_DISABLED });
    return;
  }

  const company = await findEnabledCompany(identifier);
  if (!company) {
    res.status(404).json({ error: SSO_UNAVAILABLE });
    return;
  }

  const email = identifier.includes("@")
    ? identifier.trim().toLowerCase()
    : undefined;
  const state = signSsoState({ companyId: company.id, email });
  const authorizationUrl = new URL(
    "/api/auth/sso/mock/authorize",
    appOrigin(),
  );
  authorizationUrl.searchParams.set("state", state);
  if (email) authorizationUrl.searchParams.set("email", email);

  if (req.method === "GET") {
    res.redirect(authorizationUrl.toString());
    return;
  }
  res.json({ authorizationUrl: authorizationUrl.toString() });
}

authSsoRouter.post("/sso/start", async (req, res) => {
  const identifier =
    asNonEmptyString(req.body?.identifier) ??
    asNonEmptyString(req.query.company);
  if (!identifier) {
    res.status(400).json({ error: "Company slug or work email is required" });
    return;
  }
  try {
    await startSso(identifier, req, res);
  } catch (err) {
    if (handleSsoError(err, res)) return;
    throw err;
  }
});

authSsoRouter.get("/sso/start", async (req, res) => {
  const identifier = asNonEmptyString(req.query.company);
  if (!identifier) {
    res.status(400).json({ error: "Company slug or work email is required" });
    return;
  }
  try {
    await startSso(identifier, req, res);
  } catch (err) {
    if (handleSsoError(err, res)) return;
    throw err;
  }
});

authSsoRouter.get("/sso/mock/authorize", async (req, res) => {
  if (!mockPayAllowed()) {
    res.status(503).json({ error: MOCK_SSO_DISABLED });
    return;
  }

  const stateValue = asNonEmptyString(req.query.state);
  const state = readSsoState(stateValue);
  if (!state || !stateValue) {
    res.status(400).json({ error: "Invalid callback assertions" });
    return;
  }

  const email =
    asNonEmptyString(req.query.email)?.toLowerCase() ?? state.email;
  if (!email) {
    res.status(200).type("html").send(mockAuthorizePage(stateValue));
    return;
  }

  const callback = new URL("/api/auth/sso/callback", appOrigin());
  callback.searchParams.set("code", mockOidcCodeForEmail(email));
  callback.searchParams.set("state", stateValue);
  res.redirect(callback.toString());
});

authSsoRouter.get("/sso/callback", async (req, res) => {
  if (!mockPayAllowed()) {
    res.status(503).json({ error: MOCK_SSO_DISABLED });
    return;
  }

  const state = readSsoState(req.query.state);
  const code = asNonEmptyString(req.query.code);
  if (!state || !code) {
    res.status(400).json({ error: "Invalid callback assertions" });
    return;
  }

  let ssoUser;
  try {
    ssoUser = exchangeMockOidcCodeForUser(code);
  } catch {
    res.status(400).json({ error: "Invalid callback assertions" });
    return;
  }

  try {
    const settings = await loadSettings(state.companyId);
    if (!settings || !settings.enabled) {
      res.status(403).json({ error: "Forbidden: Callback context mismatch" });
      return;
    }

    const email = ssoUser.email.toLowerCase();
    const domain = settings.email_domain?.toLowerCase();
    if (domain && !email.endsWith(`@${domain}`)) {
      res.status(403).json({ error: "Forbidden: Callback context mismatch" });
      return;
    }

    const userResult = await pool.query<{ id: number; status: string }>(
      `SELECT id, status
       FROM users
       WHERE LOWER(email) = $1
         AND company_id = $2
       LIMIT 1`,
      [email, state.companyId],
    );
    const user = userResult.rows[0];
    if (!user) {
      res.status(403).json({ error: ASK_ADMIN });
      return;
    }
    if (user.status !== "active") {
      res.status(403).json({ error: "Account status is inactive." });
      return;
    }

    const token = signSessionToken(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.redirect(new URL("/", appOrigin()).toString());
  } catch (err) {
    if (handleSsoError(err, res)) return;
    throw err;
  }
});
