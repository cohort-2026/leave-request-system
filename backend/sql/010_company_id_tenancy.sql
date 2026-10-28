-- Move invite links onto companies.id (issue 139).
--
-- 008_onboarding_links.sql keyed onboarding_links off company_name because
-- companies tenancy was not applied yet. users.company_id exists from 007.
-- This file adds onboarding_links.company_id, copies the matching companies.id
-- onto existing rows, and drops onboarding_links.company_name.
--
-- Do not drop users.company_name. That column stays as a display copy until
-- a later issue rewires authorization.
--
-- Apply after 009_billing.sql. Safe to re-run.

BEGIN;

ALTER TABLE onboarding_links
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies (id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'onboarding_links'
          AND column_name = 'company_name'
    ) THEN
        UPDATE onboarding_links AS links
        SET company_id = users_map.company_id
        FROM (
            SELECT DISTINCT ON (company_name)
                company_name,
                company_id
            FROM users
            WHERE company_id IS NOT NULL
              AND company_name IS NOT NULL
            ORDER BY company_name, company_id
        ) AS users_map
        WHERE links.company_id IS NULL
          AND links.company_name = users_map.company_name;

        UPDATE onboarding_links AS links
        SET company_id = companies.id
        FROM companies
        WHERE links.company_id IS NULL
          AND links.company_name = companies.name;

        IF EXISTS (
            SELECT 1 FROM onboarding_links WHERE company_id IS NULL
        ) THEN
            RAISE EXCEPTION
                'onboarding_links has rows with no matching companies.id';
        END IF;
    END IF;
END $$;

ALTER TABLE onboarding_links
    ALTER COLUMN company_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_links_company_id_active_key
    ON onboarding_links (company_id)
    WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS onboarding_links_company_id_idx
    ON onboarding_links (company_id);

DROP INDEX IF EXISTS onboarding_links_company_active_key;
DROP INDEX IF EXISTS onboarding_links_company_name_idx;

ALTER TABLE onboarding_links DROP COLUMN IF EXISTS company_name;

COMMIT;
