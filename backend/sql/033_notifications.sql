-- S12 in-app notifications, email outbox, and per-user prefs (issue #275).
-- Ticket file name was 029_notifications.sql; 029 is ZA public holidays.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    leave_request_id INTEGER,
    category TEXT NOT NULL
        CHECK (category IN (
            'request',
            'decision',
            'reminder',
            'digest',
            'escalation'
        )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link_path TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_user_company_fkey
        FOREIGN KEY (user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE CASCADE,
    CONSTRAINT notifications_request_company_fkey
        FOREIGN KEY (leave_request_id, company_id)
        REFERENCES leave_requests (id, company_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON notifications (user_id, created_at DESC, id DESC)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON notifications (user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS notification_prefs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER NOT NULL
        REFERENCES companies (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN (
            'request',
            'decision',
            'reminder',
            'digest',
            'escalation'
        )),
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_prefs_user_company_fkey
        FOREIGN KEY (user_id, company_id)
        REFERENCES users (id, company_id) ON DELETE CASCADE,
    CONSTRAINT notification_prefs_user_category_key
        UNIQUE (user_id, category)
);

CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INTEGER
        REFERENCES companies (id) ON DELETE CASCADE,
    notification_id INTEGER
        REFERENCES notifications (id) ON DELETE SET NULL,
    channel TEXT NOT NULL
        CHECK (channel IN ('email', 'slack', 'push')),
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sent', 'failed', 'simulated')),
    to_address TEXT,
    subject TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),
    last_error TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outbox_status_scheduled_idx
    ON outbox (status, scheduled_at, id)
    WHERE status IN ('queued', 'failed');

COMMIT;
