-- S11 date blocks (issue #274). Ticket name was 028_blocks.sql; 028 is
-- company branding, so this file is numbered 030.

BEGIN;

ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS max_off INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'departments_max_off_non_negative'
          AND conrelid = 'departments'::regclass
    ) THEN
        ALTER TABLE departments
            ADD CONSTRAINT departments_max_off_non_negative
            CHECK (max_off IS NULL OR max_off >= 0);
    END IF;
END $$;

ALTER TABLE leave_types
    ADD COLUMN IF NOT EXISTS ignores_blocks BOOLEAN DEFAULT false;

UPDATE leave_types
SET ignores_blocks = true
WHERE LOWER(name) IN ('sick', 'family responsibility');

UPDATE leave_types
SET ignores_blocks = false
WHERE ignores_blocks IS NULL;

ALTER TABLE leave_types
    ALTER COLUMN ignores_blocks SET DEFAULT false,
    ALTER COLUMN ignores_blocks SET NOT NULL;

CREATE TABLE IF NOT EXISTS date_blocks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    department_id INTEGER,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('block', 'warn')),
    reason TEXT NOT NULL CHECK (LENGTH(BTRIM(reason)) BETWEEN 1 AND 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT date_blocks_period_check CHECK (ends_on >= starts_on),
    CONSTRAINT date_blocks_id_company_id_key UNIQUE (id, company_id),
    CONSTRAINT date_blocks_department_company_fkey
        FOREIGN KEY (department_id, company_id)
        REFERENCES departments (id, company_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS date_blocks_company_period_idx
    ON date_blocks (company_id, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS date_blocks_company_department_idx
    ON date_blocks (company_id, department_id);

COMMIT;
