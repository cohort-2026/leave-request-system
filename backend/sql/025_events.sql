-- S6 leave request events and protect leave history (issue 254).
-- Append-only: updates and deletes are blocked. Deleting a user who has
-- leave fails because leave_requests.employee_user_id is ON DELETE RESTRICT.

BEGIN;

CREATE TABLE IF NOT EXISTS leave_request_events (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    leave_request_id INTEGER NOT NULL
        REFERENCES leave_requests (id) ON DELETE CASCADE,
    actor_user_id INTEGER NOT NULL
        REFERENCES users (id) ON DELETE RESTRICT,
    action TEXT NOT NULL
        CHECK (action IN (
            'submitted',
            'edited',
            'approved',
            'declined',
            'withdrawn',
            'cancelled',
            'auto_approved',
            'document_viewed'
        )),
    from_status TEXT,
    to_status TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leave_request_events_request_created_idx
    ON leave_request_events (leave_request_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS leave_request_events_company_created_idx
    ON leave_request_events (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION leave_request_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'leave_request_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS leave_request_events_no_update ON leave_request_events;
CREATE TRIGGER leave_request_events_no_update
    BEFORE UPDATE ON leave_request_events
    FOR EACH ROW
    EXECUTE FUNCTION leave_request_events_append_only();

DROP TRIGGER IF EXISTS leave_request_events_no_delete ON leave_request_events;
CREATE TRIGGER leave_request_events_no_delete
    BEFORE DELETE ON leave_request_events
    FOR EACH ROW
    EXECUTE FUNCTION leave_request_events_append_only();

ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_employee_user_id_fkey;

ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_employee_user_id_fkey
        FOREIGN KEY (employee_user_id) REFERENCES users (id) ON DELETE RESTRICT;

COMMIT;
