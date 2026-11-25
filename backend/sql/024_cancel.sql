-- Store who cancelled a leave request and the optional reason.

BEGIN;

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS cancelled_by_user_id INTEGER
        REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMIT;
