-- Hashed company invite tokens (issue 101).
--
-- One active link per company. Disable or rotate by setting disabled_at, then
-- inserting a new row. The raw token lives only in the URL; store a SHA-256
-- hex digest as token_hash. Do not add a plaintext token column.
--
-- Requires companies (issue 96, 007_companies.sql). Apply that file first.

CREATE TABLE IF NOT EXISTS onboarding_links (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disabled_at TIMESTAMPTZ,
    CONSTRAINT onboarding_links_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS onboarding_links_company_id_idx
    ON onboarding_links (company_id);

-- At most one active (not disabled) invite link per company.
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_links_company_active_key
    ON onboarding_links (company_id)
    WHERE disabled_at IS NULL;
