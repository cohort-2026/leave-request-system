-- S10 two-step approval and manager delegations (issue #273).
-- Ticket file name was 027_approval_chain.sql; 027 is S1 balances.

BEGIN;

ALTER TABLE company_leave_rules
    ADD COLUMN IF NOT EXISTS hr_step_min_days INTEGER,
    ADD COLUMN IF NOT EXISTS hr_step_unpaid BOOLEAN,
    ADD COLUMN IF NOT EXISTS escalate_after_days INTEGER;

UPDATE company_leave_rules
SET hr_step_min_days = COALESCE(hr_step_min_days, 8),
    hr_step_unpaid = COALESCE(hr_step_unpaid, true),
    escalate_after_days = COALESCE(escalate_after_days, 0);

ALTER TABLE company_leave_rules
    ALTER COLUMN hr_step_min_days SET DEFAULT 8,
    ALTER COLUMN hr_step_min_days SET NOT NULL,
    ALTER COLUMN hr_step_unpaid SET DEFAULT true,
    ALTER COLUMN hr_step_unpaid SET NOT NULL,
    ALTER COLUMN escalate_after_days SET DEFAULT 0,
    ALTER COLUMN escalate_after_days SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'company_leave_rules_hr_step_min_days_check'
          AND conrelid = 'company_leave_rules'::regclass
    ) THEN
        ALTER TABLE company_leave_rules
            ADD CONSTRAINT company_leave_rules_hr_step_min_days_check
            CHECK (hr_step_min_days >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'company_leave_rules_escalate_after_days_check'
          AND conrelid = 'company_leave_rules'::regclass
    ) THEN
        ALTER TABLE company_leave_rules
            ADD CONSTRAINT company_leave_rules_escalate_after_days_check
            CHECK (escalate_after_days >= 0);
    END IF;
END $$;

ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_status_check
        CHECK (status IN ('pending', 'pending_hr', 'approved', 'rejected', 'cancelled'));

CREATE TABLE IF NOT EXISTS leave_approval_steps (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    leave_request_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL
        CHECK (step_number >= 1),
    step_kind TEXT NOT NULL
        CHECK (step_kind IN ('manager', 'hr')),
    status TEXT NOT NULL
        CHECK (status IN ('pending', 'waiting', 'approved', 'skipped')),
    assignee_user_id INTEGER,
    acted_by_user_id INTEGER,
    acted_on_behalf_of_user_id INTEGER,
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT leave_approval_steps_request_company_fkey
        FOREIGN KEY (leave_request_id, company_id)
        REFERENCES leave_requests (id, company_id) ON DELETE CASCADE,
    CONSTRAINT leave_approval_steps_assignee_company_fkey
        FOREIGN KEY (assignee_user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE RESTRICT,
    CONSTRAINT leave_approval_steps_actor_company_fkey
        FOREIGN KEY (acted_by_user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE RESTRICT,
    CONSTRAINT leave_approval_steps_on_behalf_company_fkey
        FOREIGN KEY (acted_on_behalf_of_user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE RESTRICT,
    CONSTRAINT leave_approval_steps_request_number_key
        UNIQUE (leave_request_id, step_number)
);

CREATE INDEX IF NOT EXISTS leave_approval_steps_company_status_idx
    ON leave_approval_steps (company_id, status, step_kind);

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS approver_delegations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    manager_user_id INTEGER NOT NULL,
    delegate_user_id INTEGER NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT approver_delegations_period_check
        CHECK (ends_on >= starts_on),
    CONSTRAINT approver_delegations_not_self_check
        CHECK (manager_user_id <> delegate_user_id),
    CONSTRAINT approver_delegations_manager_company_fkey
        FOREIGN KEY (manager_user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE CASCADE,
    CONSTRAINT approver_delegations_delegate_company_fkey
        FOREIGN KEY (delegate_user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE CASCADE,
    CONSTRAINT approver_delegations_manager_overlap_excl
        EXCLUDE USING gist (
            company_id WITH =,
            manager_user_id WITH =,
            daterange(starts_on, ends_on, '[]') WITH &&
        )
);

CREATE INDEX IF NOT EXISTS approver_delegations_delegate_period_idx
    ON approver_delegations (company_id, delegate_user_id, starts_on, ends_on);

COMMIT;
