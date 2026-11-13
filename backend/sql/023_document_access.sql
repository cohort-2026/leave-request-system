-- S4 secure sick notes (issue 253).
-- Bytes live in the database; do not store a filesystem path as the source of truth.

BEGIN;

CREATE TABLE IF NOT EXISTS leave_documents (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leave_request_id INTEGER NOT NULL
        REFERENCES leave_requests (id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes INTEGER NOT NULL
        CHECK (size_bytes >= 0),
    file BYTEA NOT NULL
);

CREATE INDEX IF NOT EXISTS leave_documents_leave_request_id_idx
    ON leave_documents (leave_request_id);

CREATE TABLE IF NOT EXISTS leave_document_access (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    leave_request_id INTEGER NOT NULL
        REFERENCES leave_requests (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES users (id) ON DELETE RESTRICT,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leave_document_access_request_idx
    ON leave_document_access (company_id, leave_request_id, accessed_at DESC);

COMMIT;
