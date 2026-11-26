-- S16 medical-document threshold (issue #333 UI; database ticket #331).
-- Ticket file name was 030_deferred_sick_notes.sql; 030 is date blocks.

BEGIN;

ALTER TABLE company_leave_rules
    ADD COLUMN IF NOT EXISTS medical_document_after_working_days INTEGER NOT NULL DEFAULT 2
        CHECK (medical_document_after_working_days >= 0);

ALTER TABLE company_leave_rules
    ALTER COLUMN medical_document_after_working_days SET DEFAULT 2;

COMMIT;
