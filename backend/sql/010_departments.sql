CREATE TABLE IF NOT EXISTS departments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_name TEXT NOT NULL,
    name TEXT NOT NULL,
    manager_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS departments_company_name_unique_idx
    ON departments (company_name, LOWER(BTRIM(name)));

CREATE INDEX IF NOT EXISTS departments_company_idx
    ON departments (company_name);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department_id INTEGER
    REFERENCES departments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_department_idx
    ON users (department_id);
