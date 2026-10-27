import { pool } from "../db.js";
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

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err && typeof err === "object" && "code" in err && err.code === "42P01",
  );
}

export function isOnboardingTableMissing(err: unknown): boolean {
  return isUndefinedTable(err);
}

export async function getActiveOnboardingLink(
  companyName: string,
): Promise<OnboardingLinkStatus> {
  const result = await pool.query<{ created_at: Date }>(
    `SELECT created_at
     FROM onboarding_links
     WHERE company_name = $1 AND disabled_at IS NULL
     LIMIT 1`,
    [companyName],
  );
  const row = result.rows[0];
  if (!row) {
    return { active: false, createdAt: null };
  }
  return { active: true, createdAt: row.created_at.toISOString() };
}

export async function rotateOnboardingLink(
  companyName: string,
  createdByUserId: number,
): Promise<CreatedOnboardingLink> {
  const { token, hash } = newOnboardingToken();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE onboarding_links
       SET disabled_at = NOW()
       WHERE company_name = $1 AND disabled_at IS NULL`,
      [companyName],
    );
    const inserted = await client.query<{ created_at: Date }>(
      `INSERT INTO onboarding_links (company_name, token_hash, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING created_at`,
      [companyName, hash, createdByUserId],
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

export async function disableOnboardingLink(
  companyName: string,
): Promise<void> {
  await pool.query(
    `UPDATE onboarding_links
     SET disabled_at = NOW()
     WHERE company_name = $1 AND disabled_at IS NULL`,
    [companyName],
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
    const found = await client.query<{ company_name: string }>(
      `SELECT company_name
       FROM onboarding_links
       WHERE token_hash = $1 AND disabled_at IS NULL
       FOR UPDATE`,
      [hash],
    );
    const companyName = found.rows[0]?.company_name;
    if (!companyName) {
      await client.query("ROLLBACK");
      return "invalid";
    }

    const inserted = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash, role, status, display_name, company_name)
       VALUES ($1, $2, $3, 'pending_verification', $4, $5)
       RETURNING id, email, role, display_name, status, company_name`,
      [input.email, input.passwordHash, "staff", input.displayName, companyName],
    );
    await client.query("COMMIT");
    return inserted.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
