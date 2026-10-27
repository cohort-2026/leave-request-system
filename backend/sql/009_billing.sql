-- ZAR plans, subscriptions, invoices, and unpaid signup checkouts.
--
-- 008_onboarding_links.sql already exists, so this is 009.
-- Amounts are integer cents. Currency is ZAR. VAT is 15.00% (1500 bp).
-- Signup does not create a company until mock-pay (or a later live
-- provider webhook) completes the checkout.

CREATE TABLE IF NOT EXISTS plans (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    interval TEXT NOT NULL DEFAULT 'month',
    seat_limit INTEGER NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL,
    CONSTRAINT plans_currency_check CHECK (currency = 'ZAR'),
    CONSTRAINT plans_interval_check CHECK (interval = 'month')
);

INSERT INTO plans (code, name, amount_cents, currency, interval, seat_limit, is_public, sort_order)
VALUES
    ('starter', 'Starter', 19900, 'ZAR', 'month', 15, TRUE, 1),
    ('growth', 'Growth', 49900, 'ZAR', 'month', 50, TRUE, 2),
    ('business', 'Business', 119900, 'ZAR', 'month', 200, TRUE, 3)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    plan_code TEXT NOT NULL REFERENCES plans (code),
    status TEXT NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    vat_rate_bp INTEGER NOT NULL DEFAULT 1500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscriptions_company_id_key UNIQUE (company_id),
    CONSTRAINT subscriptions_status_check CHECK (
        status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')
    )
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    amount_cents INTEGER NOT NULL,
    vat_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    status TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invoices_currency_check CHECK (currency = 'ZAR'),
    CONSTRAINT invoices_status_check CHECK (status IN ('paid', 'open', 'void'))
);

CREATE INDEX IF NOT EXISTS invoices_company_id_idx ON invoices (company_id);

CREATE TABLE IF NOT EXISTS signup_checkouts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token_hash TEXT NOT NULL,
    company_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    plan_code TEXT NOT NULL REFERENCES plans (code),
    amount_cents INTEGER NOT NULL,
    vat_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT signup_checkouts_token_hash_key UNIQUE (token_hash),
    CONSTRAINT signup_checkouts_currency_check CHECK (currency = 'ZAR')
);

INSERT INTO subscriptions (
    company_id,
    plan_code,
    status,
    current_period_end,
    vat_rate_bp
)
SELECT
    companies.id,
    'starter',
    'active',
    NOW() + INTERVAL '1 month',
    1500
FROM companies
ON CONFLICT (company_id) DO NOTHING;
