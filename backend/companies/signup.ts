import { createHash, randomBytes } from "node:crypto";
import { quotePlan, VAT_RATE_BP, type PlanQuote } from "../billing/catalog.js";
import { pool } from "../db.js";
import { grantDefaultBalances } from "../leave/balances.js";
import { seedDefaultLeaveTypes } from "../leave/seedTypes.js";
import type { UserRow } from "../session.js";

export type SignupCompany = {
  id: number;
  name: string;
  slug: string;
  trialEndsAt: string | null;
};

export type SignupSubscription = {
  planCode: string;
  status: "active";
  currentPeriodEnd: string;
};

export type SignupInvoice = {
  amountCents: number;
  vatCents: number;
  totalCents: number;
  currency: string;
  status: "paid";
};

export type SignupResult = {
  user: UserRow;
  company: SignupCompany;
  subscription: SignupSubscription;
  invoice: SignupInvoice;
};

export type SignupCheckout = {
  checkoutToken: string;
  email: string;
  companyName: string;
  plan: {
    code: string;
    name: string;
    seatLimit: number;
  };
  amountCents: number;
  vatCents: number;
  totalCents: number;
  currency: string;
  amountLabel: string;
  vatLabel: string;
  totalLabel: string;
  expiresAt: string;
};

export type CompleteSignupFailure =
  | "invalid"
  | "expired"
  | "used"
  | "email_taken";

const SLUG_MAX = 72;
const SLUG_ATTEMPTS = 6;
const CHECKOUT_TTL_MS = 60 * 60 * 1000;

type CompanyInsert = {
  id: number;
  name: string;
  slug: string;
  trial_ends_at: Date | null;
};

type CheckoutRow = {
  id: number;
  company_name: string;
  display_name: string;
  email: string;
  password_hash: string;
  plan_code: string;
  amount_cents: number;
  vat_cents: number;
  total_cents: number;
  currency: string;
  expires_at: Date;
  paid_at: Date | null;
  completed_at: Date | null;
};

function pgCode(err: unknown): string {
  return err && typeof err === "object" && "code" in err
    ? String(err.code)
    : "";
}

function pgConstraint(err: unknown): string {
  return err && typeof err === "object" && "constraint" in err
    ? String(err.constraint)
    : "";
}

export function isCompaniesTableMissing(err: unknown): boolean {
  const code = pgCode(err);
  return code === "42P01" || code === "42703";
}

export function isEmailTaken(err: unknown): boolean {
  return pgCode(err) === "23505" && pgConstraint(err) !== "companies_slug_key";
}

export function mockPayAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_MOCK_PAY === "true"
  );
}

export function slugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
  return slug || "company";
}

function nextSlug(base: string): string {
  const suffix = randomBytes(3).toString("hex");
  const trimmed = base.slice(0, SLUG_MAX - suffix.length - 1);
  return `${trimmed}-${suffix}`;
}

function hashCheckoutToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newCheckoutToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashCheckoutToken(token) };
}

function toSignupCompany(row: CompanyInsert): SignupCompany {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    trialEndsAt: row.trial_ends_at ? row.trial_ends_at.toISOString() : null,
  };
}

function toCheckoutPublic(
  token: string,
  input: { email: string; companyName: string; expiresAt: Date },
  quote: PlanQuote,
): SignupCheckout {
  return {
    checkoutToken: token,
    email: input.email,
    companyName: input.companyName,
    plan: {
      code: quote.code,
      name: quote.name,
      seatLimit: quote.seatLimit,
    },
    amountCents: quote.amountCents,
    vatCents: quote.vatCents,
    totalCents: quote.totalCents,
    currency: quote.currency,
    amountLabel: quote.amountLabel,
    vatLabel: quote.vatLabel,
    totalLabel: quote.totalLabel,
    expiresAt: input.expiresAt.toISOString(),
  };
}

export async function emailInUse(email: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );
  return Boolean(result.rows[0]);
}

export async function createSignupCheckout(input: {
  companyName: string;
  email: string;
  passwordHash: string;
  displayName: string;
  planCode: string;
}): Promise<SignupCheckout | "email_taken" | "bad_plan"> {
  const quote = quotePlan(input.planCode);
  if (!quote) {
    return "bad_plan";
  }
  if (await emailInUse(input.email)) {
    return "email_taken";
  }

  const { token, hash } = newCheckoutToken();
  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);

  await pool.query(
    `INSERT INTO signup_checkouts (
       token_hash, company_name, display_name, email, password_hash,
       plan_code, amount_cents, vat_cents, total_cents, currency, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      hash,
      input.companyName,
      input.displayName,
      input.email,
      input.passwordHash,
      quote.code,
      quote.amountCents,
      quote.vatCents,
      quote.totalCents,
      quote.currency,
      expiresAt,
    ],
  );

  return toCheckoutPublic(
    token,
    { email: input.email, companyName: input.companyName, expiresAt },
    quote,
  );
}

export async function completePaidSignup(
  token: string,
): Promise<SignupResult | CompleteSignupFailure> {
  const hash = hashCheckoutToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const found = await client.query<CheckoutRow>(
      `SELECT id, company_name, display_name, email, password_hash, plan_code,
              amount_cents, vat_cents, total_cents, currency, expires_at,
              paid_at, completed_at
       FROM signup_checkouts
       WHERE token_hash = $1
       FOR UPDATE`,
      [hash],
    );
    const checkout = found.rows[0];
    if (!checkout) {
      await client.query("ROLLBACK");
      return "invalid";
    }
    if (checkout.completed_at || checkout.paid_at) {
      await client.query("ROLLBACK");
      return "used";
    }
    if (checkout.expires_at.getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return "expired";
    }

    const quote = quotePlan(checkout.plan_code);
    if (!quote) {
      await client.query("ROLLBACK");
      return "invalid";
    }

    const baseSlug = slugFromName(checkout.company_name);
    let company: CompanyInsert | undefined;
    let slug = baseSlug;

    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
      await client.query("SAVEPOINT signup_slug");
      try {
        const inserted = await client.query<CompanyInsert>(
          `INSERT INTO companies (name, slug, status)
           VALUES ($1, $2, 'active')
           RETURNING id, name, slug, trial_ends_at`,
          [checkout.company_name, slug],
        );
        company = inserted.rows[0];
        await client.query("RELEASE SAVEPOINT signup_slug");
        break;
      } catch (err) {
        if (pgCode(err) === "23505" && pgConstraint(err) === "companies_slug_key") {
          await client.query("ROLLBACK TO SAVEPOINT signup_slug");
          slug = nextSlug(baseSlug);
          continue;
        }
        throw err;
      }
    }

    if (!company) {
      throw new Error("Could not allocate a company slug");
    }

    await seedDefaultLeaveTypes(company.id, client);

    const insertedUser = await client.query<UserRow>(
      `INSERT INTO users (
         email, password_hash, role, status, display_name, company_name, company_id
       )
       VALUES ($1, $2, 'company_admin', 'pending_verification', $3, $4, $5)
       RETURNING id, email, role, display_name, status, company_name, company_id`,
      [
        checkout.email,
        checkout.password_hash,
        checkout.display_name,
        company.name,
        company.id,
      ],
    );
    await grantDefaultBalances(insertedUser.rows[0].id, company.id, client);

    const period = await client.query<{
      period_start: Date;
      period_end: Date;
    }>(
      `SELECT NOW() AS period_start, NOW() + INTERVAL '1 month' AS period_end`,
    );
    const periodStart = period.rows[0].period_start;
    const periodEnd = period.rows[0].period_end;

    await client.query(
      `INSERT INTO subscriptions (
         company_id, plan_code, status, current_period_end, vat_rate_bp
       )
       VALUES ($1, $2, 'active', $3, $4)`,
      [company.id, quote.code, periodEnd, VAT_RATE_BP],
    );

    await client.query(
      `INSERT INTO invoices (
         company_id, amount_cents, vat_cents, total_cents, currency, status,
         period_start, period_end
       )
       VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7)`,
      [
        company.id,
        checkout.amount_cents,
        checkout.vat_cents,
        checkout.total_cents,
        checkout.currency,
        periodStart,
        periodEnd,
      ],
    );

    await client.query(
      `UPDATE signup_checkouts
       SET paid_at = NOW(), completed_at = NOW()
       WHERE id = $1`,
      [checkout.id],
    );

    await client.query("COMMIT");

    return {
      user: insertedUser.rows[0],
      company: toSignupCompany(company),
      subscription: {
        planCode: quote.code,
        status: "active",
        currentPeriodEnd: periodEnd.toISOString(),
      },
      invoice: {
        amountCents: checkout.amount_cents,
        vatCents: checkout.vat_cents,
        totalCents: checkout.total_cents,
        currency: checkout.currency,
        status: "paid",
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
