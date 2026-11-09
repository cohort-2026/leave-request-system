-- Companies tenancy (issue 96).
--
-- Runtime tenancy is still users.company_name until issue 97. This file adds
-- a real companies row and users.company_id. Keep company_name as a display
-- copy of companies.name. Do not drop company_name here.
--
-- 006_totp_reset.sql already exists, so this is 007. Invite links stay 008
-- and still key off company_name until a later migration.

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT companies_slug_key UNIQUE (slug),
    CONSTRAINT companies_status_check CHECK (status IN ('active', 'suspended'))
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies (id);

CREATE INDEX IF NOT EXISTS users_company_id_idx ON users (company_id);

INSERT INTO companies (name, slug, status)
VALUES ('Acme', 'acme', 'active')
ON CONFLICT (slug) DO NOTHING;

UPDATE users
SET
    company_id = companies.id,
    company_name = companies.name
FROM companies
WHERE companies.slug = 'acme'
  AND users.company_name = 'Acme';

INSERT INTO companies (name, slug, status)
VALUES ('Khumalo Retail', 'khumalo-retail', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Same bcrypt hash as sql/002_seed_users.sql (password Leave2026!).
INSERT INTO users (
    email,
    password_hash,
    role,
    display_name,
    status,
    company_name,
    company_id
)
SELECT
    'admin.khumalo@leave.local',
    '$2b$10$Tj45LBbHoGpdS1UECk96VeiZg6sYUccLHBfZxQUA2T5KAIMUdvlnG',
    'company_admin',
    'Khumalo admin',
    'active',
    companies.name,
    companies.id
FROM companies
WHERE companies.slug = 'khumalo-retail'
ON CONFLICT (email) DO NOTHING;
