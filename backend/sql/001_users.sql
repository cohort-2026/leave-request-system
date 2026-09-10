-- backend/sql/001_users.sql
-- Postgres - users table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',

    -- Constraints - enforced in SQL
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('staff', 'manager', 'company_admin', 'platform')),
    CONSTRAINT ck_users_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Enforce case-insensitive unique email + faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);
CREATE INDEX IF NOT EXISTS ix_users_status ON users (status);
