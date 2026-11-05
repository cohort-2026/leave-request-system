-- Official company-scoped leave request records (issue 163).

BEGIN;

CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    employee_user_id INTEGER NOT NULL
        REFERENCES users (id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL
        REFERENCES leave_types (id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_days_count INTEGER NOT NULL
        CHECK (working_days_count >= 0),
    reason TEXT,
    supporting_file_name TEXT,
    supporting_file_key TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    reviewer_user_id INTEGER
        REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    decision_reason TEXT,
    CONSTRAINT leave_requests_date_range_check
        CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS leave_requests_company_employee_status_idx
    ON leave_requests (company_id, employee_user_id, status);

COMMIT;
