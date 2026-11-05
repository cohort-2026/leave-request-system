import { pool } from "../db.js";
import { grantDefaultBalances } from "../leave/balances.js";
import { appOrigin } from "../mail/index.js";
import type { UserRow } from "../session.js";
import { hashOnboardingToken, newOnboardingToken } from "./tokens.js";

export type OnboardingLinkStatus = {
  active: boolean;
  createdAt: string | null;
};

export type CreatedOnboardingLink = {
  url: string;
  createdAt: string;
};

function pgCode(err: unknown): string {
  return err && typeof err === "object" && "code" in err
    ? String(err.code)
    : "";
}

export function isOnboardingTableMissing(err: unknown): boolean {
  const code = pgCode(err);
  return code === "42P01" || code === "42703";
}

export async function getActiveOnboardingLink(
  companyId: number,
): Promise<OnboardingLinkStatus> {
  const result = await pool.query<{ created_at: Date }>(
    `SELECT created_at
     FROM onboarding_links
     WHERE company_id = $1 AND disabled_at IS NULL
     LIMIT 1`,
    [companyId],
  );
  const row = result.rows[0];
  if (!row) {
    return { active: false, createdAt: null };
  }
  return { active: true, createdAt: row.created_at.toISOString() };
}

export async function rotateOnboardingLink(
  companyId: number,
  createdByUserId: number,
): Promise<CreatedOnboardingLink> {
  const { token, hash } = newOnboardingToken();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE onboarding_links
       SET disabled_at = NOW()
       WHERE company_id = $1 AND disabled_at IS NULL`,
      [companyId],
    );
    const inserted = await client.query<{ created_at: Date }>(
      `INSERT INTO onboarding_links (company_id, token_hash, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING created_at`,
      [companyId, hash, createdByUserId],
    );
    await client.query("COMMIT");
    return {
      url: `${appOrigin()}/onboard/${encodeURIComponent(token)}`,
      createdAt: inserted.rows[0].created_at.toISOString(),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function disableOnboardingLink(companyId: number): Promise<void> {
  await pool.query(
    `UPDATE onboarding_links
     SET disabled_at = NOW()
     WHERE company_id = $1 AND disabled_at IS NULL`,
    [companyId],
  );
}

export async function onboardWithInvite(input: {
  token: string;
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<UserRow | "invalid"> {
  const hash = hashOnboardingToken(input.token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const found = await client.query<{
      company_id: number;
      company_name: string;
    }>(
      `SELECT links.company_id, companies.name AS company_name
       FROM onboarding_links AS links
       INNER JOIN companies ON companies.id = links.company_id
       WHERE links.token_hash = $1 AND links.disabled_at IS NULL
       FOR UPDATE OF links`,
      [hash],
    );
    const company = found.rows[0];
    if (!company) {
      await client.query("ROLLBACK");
      return "invalid";
    }

    const inserted = await client.query<UserRow>(
      `INSERT INTO users (
         email, password_hash, role, status, display_name, company_name, company_id
       )
       VALUES ($1, $2, $3, 'pending_verification', $4, $5, $6)
       RETURNING id, email, role, display_name, status, company_name, company_id`,
      [
        input.email,
        input.passwordHash,
        "staff",
        input.displayName,
        company.company_name,
        company.company_id,
      ],
    );
    const user = inserted.rows[0];
    await grantDefaultBalances(user.id, company.company_id, client);
    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
