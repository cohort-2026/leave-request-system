-- Company- and department-scoped leave date blocks.

BEGIN;

CREATE TABLE IF NOT EXISTS company_date_blocks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    department_id INTEGER,
    mode TEXT NOT NULL CHECK (mode IN ('block', 'warn')),
    reason TEXT NOT NULL CHECK (LENGTH(BTRIM(reason)) BETWEEN 1 AND 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT company_date_blocks_period_check CHECK (end_date >= start_date),
    CONSTRAINT company_date_blocks_department_company_fkey
        FOREIGN KEY (department_id, company_id)
        REFERENCES departments (id, company_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS company_date_blocks_company_period_idx
    ON company_date_blocks (company_id, start_date, end_date);

COMMIT;
