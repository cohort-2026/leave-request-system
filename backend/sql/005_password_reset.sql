-- Password reset (presentation feedback / issue 69).
--
-- Do not store the raw token. Hash it, keep expiry and used-at on this table.
-- Tokens are single-use with a short TTL (the API uses 1 hour).

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT password_reset_tokens_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id);
