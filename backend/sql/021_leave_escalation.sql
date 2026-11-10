-- Company leave-review timeouts and the people allowed to decide each request.

BEGIN;

ALTER TABLE company_leave_rules
    ADD COLUMN IF NOT EXISTS escalate_after_hours NUMERIC(8, 2) NOT NULL DEFAULT 0
        CHECK (escalate_after_hours >= 0),
    ADD COLUMN IF NOT EXISTS auto_approve_after_hours NUMERIC(8, 2) NOT NULL DEFAULT 0
        CHECK (auto_approve_after_hours >= 0);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'company_leave_rules_escalation_order_check'
          AND conrelid = 'company_leave_rules'::regclass
    ) THEN
        ALTER TABLE company_leave_rules
            ADD CONSTRAINT company_leave_rules_escalation_order_check
            CHECK (
                escalate_after_hours = 0
                OR auto_approve_after_hours = 0
                OR auto_approve_after_hours >= escalate_after_hours
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leave_requests_id_company_id_key'
          AND conrelid = 'leave_requests'::regclass
    ) THEN
        ALTER TABLE leave_requests
            ADD CONSTRAINT leave_requests_id_company_id_key UNIQUE (id, company_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS leave_request_assignees (
    leave_request_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assignment_type TEXT NOT NULL
        CHECK (assignment_type IN ('original', 'escalation')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (leave_request_id, user_id),
    CONSTRAINT leave_request_assignees_request_company_fkey
        FOREIGN KEY (leave_request_id, company_id)
        REFERENCES leave_requests (id, company_id) ON DELETE CASCADE,
    CONSTRAINT leave_request_assignees_user_company_fkey
        FOREIGN KEY (user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE CASCADE,
    CONSTRAINT leave_request_assignees_request_type_key
        UNIQUE (leave_request_id, assignment_type)
);

INSERT INTO leave_request_assignees (
    leave_request_id,
    company_id,
    user_id,
    assignment_type
)
SELECT id, company_id, reviewer_user_id, 'original'
FROM leave_requests
WHERE status = 'pending'
  AND reviewer_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS leave_request_assignees_user_request_idx
    ON leave_request_assignees (user_id, leave_request_id);

COMMIT;
