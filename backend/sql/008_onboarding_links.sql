-- Hashed company invite tokens (issues 101 and 102).
--
-- One active link per company. Disable or rotate by setting disabled_at, then
-- inserting a new row. The raw token lives only in the URL; store a SHA-256
-- hex digest as token_hash. Do not add a plaintext token column.
--
-- Issue 101 specified company_id REFERENCES companies(id). Companies tenancy
-- (#96, 007_companies.sql) is not in this folder yet, so this table uses
-- users.company_name (the current tenancy key). A later companies migration
-- can add company_id and backfill.

CREATE TABLE IF NOT EXISTS onboarding_links (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disabled_at TIMESTAMPTZ,
    CONSTRAINT onboarding_links_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS onboarding_links_company_name_idx
    ON onboarding_links (company_name);

-- At most one active (not disabled) invite link per company.
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_links_company_active_key
    ON onboarding_links (company_name)
    WHERE disabled_at IS NULL;
