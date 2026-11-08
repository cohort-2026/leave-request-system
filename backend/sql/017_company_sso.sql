-- Per-company OIDC SSO settings (issues 117 and 118).
-- Client secret is stored as a cipher, same packing as TOTP secrets.

BEGIN;

CREATE TABLE IF NOT EXISTS company_oidc_settings (
    company_id INTEGER PRIMARY KEY
        REFERENCES companies (id) ON DELETE CASCADE,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret_cipher TEXT NOT NULL,
    email_domain TEXT,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
