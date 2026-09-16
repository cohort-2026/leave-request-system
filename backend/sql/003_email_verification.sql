-- Email verification (presentation feedback / issue 68).
--
-- New registrations use users.status = 'pending_verification' until the
-- emailed link is consumed. Seeded demo users stay `active` and can sign in.
-- Do not store the raw token. Hash it, keep expiry and used-at on this table.

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_verification_tokens_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx
    ON email_verification_tokens (user_id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (
    status IN ('pending_verification', 'pending_approval', 'active')
);
