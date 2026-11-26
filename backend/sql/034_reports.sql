-- S15 report fields and export audit log (issue #276).
-- Ticket file name was 032_reports.sql; 032 is the S10 approval chain.

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_number TEXT,
    ADD COLUMN IF NOT EXISTS daily_rate_zar NUMERIC(12, 2);

CREATE UNIQUE INDEX IF NOT EXISTS users_company_employee_number_key
    ON users (company_id, employee_number)
    WHERE employee_number IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_daily_rate_zar_check'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_daily_rate_zar_check
            CHECK (daily_rate_zar IS NULL OR daily_rate_zar >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS report_exports (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    exported_by_user_id INTEGER NOT NULL,
    kind TEXT NOT NULL
        CHECK (kind IN ('summary', 'liability', 'payroll', 'balances')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT report_exports_user_company_fkey
        FOREIGN KEY (exported_by_user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS report_exports_company_created_idx
    ON report_exports (company_id, created_at DESC, id DESC);

COMMIT;
