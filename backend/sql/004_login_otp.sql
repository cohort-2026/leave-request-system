-- Login email OTP (presentation feedback / issue 77).
--
-- After a verified user enters a correct password, they must submit a
-- short-lived code from email before the session cookie is set.
-- Seeded demo users skip this step. Do not store the raw code.
-- Hash includes the user id so two people can hold the same 6-digit value.

CREATE TABLE IF NOT EXISTS login_otp_tokens (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT login_otp_tokens_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS login_otp_tokens_user_id_idx
    ON login_otp_tokens (user_id);
