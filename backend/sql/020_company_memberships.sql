-- Allow one email address to have a separate user membership in each company.

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
DROP INDEX IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_key
    ON users (company_id, lower(email))
    WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_global_email_key
    ON users (lower(email))
    WHERE company_id IS NULL;

COMMIT;
