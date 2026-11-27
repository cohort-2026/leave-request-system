-- S17 record who booked leave when it is not the employee (issue #334).
-- Ticket file name was 031_leave_on_behalf.sql; 031 is the medical-document rule.

BEGIN;

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS submitted_by_user_id INTEGER
        REFERENCES users (id) ON DELETE SET NULL;

UPDATE leave_requests
SET submitted_by_user_id = employee_user_id
WHERE submitted_by_user_id IS NULL;

COMMENT ON COLUMN leave_requests.submitted_by_user_id IS
    'The actor who booked the leave. employee_user_id remains the person the leave is for.';

COMMIT;
