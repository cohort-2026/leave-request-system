-- S2 half-day edges on leave requests (issue 252).
-- Existing rows default to full days.

BEGIN;

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS start_half TEXT NOT NULL DEFAULT 'full',
    ADD COLUMN IF NOT EXISTS end_half TEXT NOT NULL DEFAULT 'full';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leave_requests_start_half_check'
          AND conrelid = 'leave_requests'::regclass
    ) THEN
        ALTER TABLE leave_requests
            ADD CONSTRAINT leave_requests_start_half_check
            CHECK (start_half IN ('full', 'am', 'pm'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leave_requests_end_half_check'
          AND conrelid = 'leave_requests'::regclass
    ) THEN
        ALTER TABLE leave_requests
            ADD CONSTRAINT leave_requests_end_half_check
            CHECK (end_half IN ('full', 'am', 'pm'));
    END IF;
END $$;

ALTER TABLE leave_requests
    ALTER COLUMN working_days_count TYPE NUMERIC(8, 2);

ALTER TABLE leave_balances
    ALTER COLUMN days_remaining TYPE NUMERIC(8, 2),
    ALTER COLUMN days_used TYPE NUMERIC(8, 2);

COMMIT;
