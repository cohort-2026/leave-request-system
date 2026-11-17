-- Immutable leave request audit events and user deletion restriction (Sprint 1 S6).

BEGIN;

CREATE TABLE IF NOT EXISTS leave_events (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    leave_request_id INTEGER NOT NULL
        REFERENCES leave_requests (id) ON DELETE CASCADE,
    actor_user_id INTEGER NOT NULL
        REFERENCES users (id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'submit',
            'edit',
            'approve',
            'decline',
            'withdraw',
            'auto_approve',
            'document_view'
        )),
    before_state JSONB,
    after_state JSONB,
    balance_delta NUMERIC(6, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leave_events_request_created_idx
    ON leave_events (leave_request_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS leave_events_company_created_idx
    ON leave_events (company_id, created_at DESC);

ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_employee_user_id_fkey,
    ADD CONSTRAINT leave_requests_employee_user_id_fkey
        FOREIGN KEY (employee_user_id) REFERENCES users (id) ON DELETE RESTRICT;

COMMIT;
