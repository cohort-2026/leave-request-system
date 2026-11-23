-- Company appearance: slogan, brand colours, and logo bytes.
-- Default product theme stays emerald when these columns are null.

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slogan TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent TEXT,
  ADD COLUMN IF NOT EXISTS brand_colors_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS logo_mime TEXT,
  ADD COLUMN IF NOT EXISTS logo BYTEA;

ALTER TABLE signup_checkouts
  ADD COLUMN IF NOT EXISTS slogan TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent TEXT,
  ADD COLUMN IF NOT EXISTS brand_colors_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS logo_mime TEXT,
  ADD COLUMN IF NOT EXISTS logo BYTEA;

COMMIT;
