-- Ensure departments and nullable user department assignments exist.
-- 012_departments.sql already created a company-scoped version used by the
-- current API, so keep its manager_id column and tenant constraints intact.

BEGIN;

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    name TEXT NOT NULL,
    manager_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT departments_company_id_name_key UNIQUE (company_id, name)
);

ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS manager_user_id INTEGER;

ALTER TABLE departments
    ALTER COLUMN manager_user_id DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'departments'
          AND column_name = 'manager_id'
    ) THEN
        UPDATE departments
        SET manager_user_id = manager_id
        WHERE manager_user_id IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'departments_manager_user_id_fkey'
          AND conrelid = 'departments'::regclass
    ) THEN
        ALTER TABLE departments
            ADD CONSTRAINT departments_manager_user_id_fkey
            FOREIGN KEY (manager_user_id)
            REFERENCES users (id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'departments_company_id_name_key'
          AND conrelid = 'departments'::regclass
    ) THEN
        ALTER TABLE departments
            ADD CONSTRAINT departments_company_id_name_key
            UNIQUE (company_id, name);
    END IF;
END $$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department_id INTEGER;

ALTER TABLE users
    ALTER COLUMN department_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_department_id_fkey'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_department_id_fkey
            FOREIGN KEY (department_id)
            REFERENCES departments (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_department_id_idx
    ON users (department_id);

COMMIT;
