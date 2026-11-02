BEGIN;

CREATE TABLE IF NOT EXISTS company_leave_rules (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE
        REFERENCES companies (id) ON DELETE CASCADE,
    staff_reviewer TEXT NOT NULL DEFAULT 'manager'
        CHECK (staff_reviewer IN ('manager', 'company_admin')),
    manager_reviewer TEXT NOT NULL DEFAULT 'company_admin'
        CHECK (manager_reviewer = 'company_admin'),
    min_notice_days INTEGER NOT NULL DEFAULT 0
        CHECK (min_notice_days >= 0)
);

INSERT INTO company_leave_rules (company_id)
SELECT id
FROM companies
ON CONFLICT (company_id) DO NOTHING;

COMMIT;
