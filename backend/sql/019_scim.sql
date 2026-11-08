-- Company-scoped SCIM bearer token hashes and user provisioning fields.

BEGIN;

CREATE TABLE IF NOT EXISTS company_scim_tokens (
    company_id INTEGER PRIMARY KEY
        REFERENCES companies (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT;

COMMIT;
