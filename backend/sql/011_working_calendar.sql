-- Company working weekdays and company-specific public holidays (issue 143).

BEGIN;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS monday_is_working BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS tuesday_is_working BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS wednesday_is_working BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS thursday_is_working BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS friday_is_working BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS saturday_is_working BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sunday_is_working BOOLEAN DEFAULT FALSE;

UPDATE companies
SET
    monday_is_working = COALESCE(monday_is_working, TRUE),
    tuesday_is_working = COALESCE(tuesday_is_working, TRUE),
    wednesday_is_working = COALESCE(wednesday_is_working, TRUE),
    thursday_is_working = COALESCE(thursday_is_working, TRUE),
    friday_is_working = COALESCE(friday_is_working, TRUE),
    saturday_is_working = COALESCE(saturday_is_working, FALSE),
    sunday_is_working = COALESCE(sunday_is_working, FALSE);

ALTER TABLE companies
    ALTER COLUMN monday_is_working SET DEFAULT TRUE,
    ALTER COLUMN monday_is_working SET NOT NULL,
    ALTER COLUMN tuesday_is_working SET DEFAULT TRUE,
    ALTER COLUMN tuesday_is_working SET NOT NULL,
    ALTER COLUMN wednesday_is_working SET DEFAULT TRUE,
    ALTER COLUMN wednesday_is_working SET NOT NULL,
    ALTER COLUMN thursday_is_working SET DEFAULT TRUE,
    ALTER COLUMN thursday_is_working SET NOT NULL,
    ALTER COLUMN friday_is_working SET DEFAULT TRUE,
    ALTER COLUMN friday_is_working SET NOT NULL,
    ALTER COLUMN saturday_is_working SET DEFAULT FALSE,
    ALTER COLUMN saturday_is_working SET NOT NULL,
    ALTER COLUMN sunday_is_working SET DEFAULT FALSE,
    ALTER COLUMN sunday_is_working SET NOT NULL;

CREATE TABLE IF NOT EXISTS public_holidays (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    holiday_date DATE NOT NULL,
    name TEXT NOT NULL,
    CONSTRAINT public_holidays_company_date_key UNIQUE (company_id, holiday_date)
);

COMMIT;
