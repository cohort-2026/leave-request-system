-- Company-scoped departments and user assignments (issue 157).

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS users_id_company_id_key
    ON users (id, company_id);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    name TEXT NOT NULL,
    manager_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT departments_id_company_id_key UNIQUE (id, company_id),
    CONSTRAINT departments_manager_company_fkey
        FOREIGN KEY (manager_id, company_id)
        REFERENCES users (id, company_id)
        ON DELETE SET NULL (manager_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS departments_company_id_name_unique_idx
    ON departments (company_id, LOWER(BTRIM(name)));

CREATE INDEX IF NOT EXISTS departments_company_id_idx
    ON departments (company_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_department_company_fkey'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_department_company_fkey
            FOREIGN KEY (department_id, company_id)
            REFERENCES departments (id, company_id)
            ON DELETE SET NULL (department_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_department_company_idx
    ON users (department_id, company_id);

COMMIT;
