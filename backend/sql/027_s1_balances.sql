-- Sprint 1 balances: reserve pending requests and represent unlimited leave.

BEGIN;

ALTER TABLE leave_types
    ADD COLUMN IF NOT EXISTS has_balance BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS cycle_months INTEGER DEFAULT 12;

UPDATE leave_types
SET has_balance = true
WHERE has_balance IS NULL;

UPDATE leave_types
SET cycle_months = 12
WHERE cycle_months IS NULL
  AND has_balance = true;

UPDATE leave_types
SET has_balance = false,
    cycle_months = NULL
WHERE LOWER(name) = 'unpaid';

UPDATE leave_types
SET cycle_months = 36
WHERE LOWER(name) = 'sick'
  AND has_balance = true;

ALTER TABLE leave_types
    ALTER COLUMN has_balance SET DEFAULT true,
    ALTER COLUMN has_balance SET NOT NULL,
    ALTER COLUMN cycle_months SET DEFAULT 12;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leave_types_cycle_months_positive'
          AND conrelid = 'leave_types'::regclass
    ) THEN
        ALTER TABLE leave_types
            ADD CONSTRAINT leave_types_cycle_months_positive
            CHECK (cycle_months IS NULL OR cycle_months > 0);
    END IF;
END $$;

ALTER TABLE leave_balances
    ADD COLUMN IF NOT EXISTS entitled_days NUMERIC(5, 1);

UPDATE leave_balances
SET entitled_days = days_used + days_remaining
WHERE entitled_days IS NULL;

ALTER TABLE leave_balances
    ALTER COLUMN entitled_days SET NOT NULL,
    ALTER COLUMN entitled_days TYPE NUMERIC(5, 1)
        USING entitled_days::NUMERIC(5, 1),
    ALTER COLUMN days_used TYPE NUMERIC(5, 1)
        USING days_used::NUMERIC(5, 1),
    ALTER COLUMN days_remaining TYPE NUMERIC(5, 1)
        USING days_remaining::NUMERIC(5, 1);

ALTER TABLE leave_requests
    ALTER COLUMN working_days_count TYPE NUMERIC(5, 1)
        USING working_days_count::NUMERIC(5, 1);

ALTER TABLE leave_requests
    DROP CONSTRAINT IF EXISTS leave_requests_working_days_count_check,
    DROP CONSTRAINT IF EXISTS leave_requests_working_days_count_positive;

-- Keep legacy zero-day rows readable; the new constraint applies to all writes.
ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_working_days_count_positive
    CHECK (working_days_count > 0) NOT VALID;

INSERT INTO leave_balances (
    company_id,
    user_id,
    leave_type_id,
    entitled_days,
    days_remaining,
    days_used
)
SELECT
    users.company_id,
    users.id,
    leave_types.id,
    CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END,
    CASE WHEN leave_types.has_balance THEN leave_types.default_days ELSE 0 END,
    0
FROM users
JOIN leave_types
    ON leave_types.company_id = users.company_id
WHERE users.status = 'active'
  AND users.role <> 'platform'
  AND users.company_id IS NOT NULL
  AND COALESCE(leave_types.is_active, true) = true
ON CONFLICT (user_id, leave_type_id) DO NOTHING;

COMMIT;
