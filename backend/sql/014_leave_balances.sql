-- Company-scoped leave balances initialized from each leave type's defaults.

BEGIN;

CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types (id) ON DELETE CASCADE,
    days_remaining INTEGER NOT NULL,
    days_used INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT leave_balances_user_leave_type_key UNIQUE (user_id, leave_type_id)
);

INSERT INTO leave_balances (
    company_id,
    user_id,
    leave_type_id,
    days_remaining,
    days_used
)
SELECT
    users.company_id,
    users.id,
    leave_types.id,
    leave_types.default_days,
    0
FROM users
JOIN leave_types
    ON leave_types.company_id = users.company_id
WHERE users.role <> 'platform'
  AND users.company_id IS NOT NULL
ON CONFLICT (user_id, leave_type_id) DO NOTHING;

COMMIT;
