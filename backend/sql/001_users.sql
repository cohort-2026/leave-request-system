-- users table (Week 4 Member 1.2)
--
-- password_hash, not password: we only store a bcrypt hash. If the database
-- leaks, the real password is not sitting in the row.
-- email UNIQUE: one login per email, so register can return 409 instead of
-- creating a second person with the same address.
--
-- id is INTEGER to match the existing Neon table and the JWT `sub` (a number).
-- Do not switch this to UUID without changing session.ts.

CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_role_check CHECK (
        role IN ('staff', 'manager', 'company_admin', 'platform')
    )
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;

UPDATE users SET status = 'active' WHERE status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
