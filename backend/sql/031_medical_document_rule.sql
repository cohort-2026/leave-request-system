BEGIN;

ALTER TABLE company_leave_rules
    ADD COLUMN IF NOT EXISTS medical_document_after_working_days INTEGER NOT NULL DEFAULT 2
        CHECK (medical_document_after_working_days >= 0);

ALTER TABLE company_leave_rules
    ALTER COLUMN medical_document_after_working_days SET DEFAULT 2;

COMMIT;
