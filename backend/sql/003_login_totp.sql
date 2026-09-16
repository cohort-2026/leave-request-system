-- Authenticator TOTP after password (#77).
--
-- Drops emailed login OTP storage if a previous experiment created it.
-- Secrets are stored encrypted by the API, not as plaintext.

DROP TABLE IF EXISTS login_otp_tokens;

CREATE TABLE IF NOT EXISTS login_challenges (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    pending_secret_cipher TEXT,
    CONSTRAINT login_challenges_token_hash_key UNIQUE (token_hash),
    CONSTRAINT login_challenges_purpose_check CHECK (
        purpose IN ('enroll', 'login')
    )
);

CREATE INDEX IF NOT EXISTS login_challenges_user_id_idx
    ON login_challenges (user_id);

CREATE TABLE IF NOT EXISTS user_totp (
    user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    secret_cipher TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ NOT NULL,
    last_step BIGINT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS totp_recovery_codes (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    CONSTRAINT totp_recovery_codes_code_hash_key UNIQUE (code_hash)
);

CREATE INDEX IF NOT EXISTS totp_recovery_codes_user_id_idx
    ON totp_recovery_codes (user_id);
