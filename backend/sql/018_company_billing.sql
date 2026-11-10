-- Company billing contact details.

BEGIN;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS billing_email TEXT,
    ADD COLUMN IF NOT EXISTS vat_number TEXT;

COMMIT;
