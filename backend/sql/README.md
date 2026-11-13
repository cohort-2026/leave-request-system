# Users table and seed logins

Apply from `backend/` after `DATABASE_URL` is set:

```sh
psql "$DATABASE_URL" -f sql/001_users.sql
psql "$DATABASE_URL" -f sql/002_seed_users.sql
psql "$DATABASE_URL" -f sql/003_login_totp.sql
psql "$DATABASE_URL" -f sql/004_email_verification.sql
psql "$DATABASE_URL" -f sql/005_password_reset.sql
psql "$DATABASE_URL" -f sql/006_totp_reset.sql
psql "$DATABASE_URL" -f sql/007_companies.sql
psql "$DATABASE_URL" -f sql/008_onboarding_links.sql
psql "$DATABASE_URL" -f sql/009_billing.sql
psql "$DATABASE_URL" -f sql/010_company_id_tenancy.sql
psql "$DATABASE_URL" -f sql/011_working_calendar.sql
psql "$DATABASE_URL" -f sql/012_departments.sql
psql "$DATABASE_URL" -f sql/013_leave_types.sql
psql "$DATABASE_URL" -f sql/014_leave_balances.sql
psql "$DATABASE_URL" -f sql/015_company_leave_rules.sql
psql "$DATABASE_URL" -f sql/016_leave_requests.sql
psql "$DATABASE_URL" -f sql/017_company_sso.sql
psql "$DATABASE_URL" -f sql/018_company_billing.sql
psql "$DATABASE_URL" -f sql/019_scim.sql
psql "$DATABASE_URL" -f sql/020_company_memberships.sql
psql "$DATABASE_URL" -f sql/021_leave_escalation.sql
psql "$DATABASE_URL" -f sql/022_half_days.sql
psql "$DATABASE_URL" -f sql/023_document_access.sql
```

`003_login_totp.sql` adds login challenges, encrypted TOTP secrets, and hashed recovery codes. It also drops `login_otp_tokens` if that table exists from an earlier emailed-OTP experiment.

`004_email_verification.sql` adds hashed email-verification tokens. New registrations are `pending_verification` until the emailed link is consumed. Seeded demo users stay `active`.

`005_password_reset.sql` adds hashed password-reset tokens. Forgot-password emails a one-hour link. Reset does not sign the user in.

`006_totp_reset.sql` adds hashed authenticator-reset tokens. The signed-in profile emails a one-hour link. TOTP is not removed until the link is consumed.

`007_companies.sql` adds the `companies` table and `users.company_id` (issue 96). It backfills Acme, keeps `company_name` as a display copy, and seeds Khumalo Retail (`admin.khumalo@leave.local`). Authorization uses `company_id` (issue 140).

`008_onboarding_links.sql` adds hashed company invite tokens (issues 101 and 102). One active link per company (`disabled_at IS NULL`). The raw token is never stored. 008 keys the table off `company_name`; `010` moves that key to `company_id`.

`009_billing.sql` adds ZAR `plans`, `subscriptions`, `invoices`, and `signup_checkouts`. Signup stores a checkout first; mock-pay creates the company, an `active` subscription, and a paid invoice. Demo companies are backfilled onto Starter `active`.

`010_company_id_tenancy.sql` (issue 139) adds `onboarding_links.company_id` as a foreign key to `companies`, backfills existing invite rows from `users.company_name` / `companies.name`, keeps at most one active link per `company_id`, and drops `onboarding_links.company_name`. It does not drop `users.company_name`.

`011_working_calendar.sql` (issue 143) adds Monday–Friday working-day defaults and Saturday–Sunday non-working defaults to each company, backfills existing companies, and creates `public_holidays` with a unique date per company.

`012_departments.sql` (issue 157) adds company-scoped departments and user assignments, with composite foreign keys preventing a manager or user from being assigned across companies.

`014_leave_balances.sql` creates company-, user-, and leave-type-linked balances, then initializes one row for each non-platform user's company leave types using `default_days`. Platform users receive no balances, and company scoping prevents users from receiving another company's leave types. Re-running the seed leaves existing balances unchanged.

## Migrations

### `013_leave_types.sql`
- **Purpose**: Creates the company-scoped `leave_types` table and seeds five starter types for every company that exists when the migration runs. The `(company_id, name)` unique constraint keeps each company's type in its own row.
- **Seeded Defaults** (per company):
  - Annual: 15 days, no backdate, no document required
  - Sick: 10 days, backdate allowed, document required after 2 days
  - Family responsibility: 3 days, backdate allowed, no document required
  - Unpaid: 0 days, no backdate, no document required
  - Study: 5 days, no backdate, no document required
- These values are **demo defaults, not legal advice**. An administrator can change them later.

`015_company_leave_rules.sql` (issue 159) creates one reviewer/minimum-notice settings row per company, applies the manager / company-admin / zero-day defaults, and backfills existing companies.

`016_leave_requests.sql` (issue 163) creates the official leave request records, including working-day count, supporting-file metadata, submission/cancellation timestamps, and reviewer decision fields.

`017_company_sso.sql` (issues 117 and 118) stores per-company OIDC settings. The client secret is a cipher column, not plaintext. An enabled flag and optional email domain are included.

`018_company_billing.sql` adds billing email and VAT number fields to `companies`; the VAT number is free text. `009_billing.sql` already creates `invoices` with integer-cent amounts, a ZAR currency check, status, and billing-period timestamps.

`019_scim.sql` adds one SCIM token-hash row per company; the raw bearer token is not stored. It also adds `users.first_name`, `users.last_name`, and optional `users.phone` while keeping `display_name`.

`020_company_memberships.sql` allows the same email address to have a separate user membership in multiple companies, while retaining one membership per email per company and one global account for users without a company. Password sign-in asks which matching company account to use; each membership keeps its own authenticator. Verifying one address activates its pending memberships, and resetting its password updates all memberships for that email.

`021_leave_escalation.sql` adds company-configured escalation and automatic-approval timeouts (both off by default) and records the company-scoped users allowed to decide each pending request. Existing pending requests retain their original reviewer.

`022_half_days.sql` (issue 252) adds `leave_requests.start_half` and `end_half` (`full`, `am`, `pm`, default `full`) so a request can start or end on a half day. Existing rows stay full. `working_days_count` and balance remaining/used become `NUMERIC(8, 2)` so 0.5 days can be stored.

`023_document_access.sql` (issue 253) stores sick notes in `leave_documents.file` as BYTEA (filename, mime, size_bytes) and logs authorised downloads in `leave_document_access`. The file bytes are the source of truth; do not store a filesystem path.

## Demo password

All four seed accounts use the same password: `Leave2026!`

Hashes in `002_seed_users.sql` were generated with `bcrypt.hash(password, 10)`.

| Role | Email |
| --- | --- |
| staff | `staff@leave.local` |
| manager | `manager@leave.local` |
| company_admin | `admin@leave.local` |
| platform | `platform@leave.local` |

Seed accounts skip email verification (they are already `active`) but **must** enroll an authenticator app on first login after `003` is applied. Later logins need a 6-digit TOTP. A one-time recovery code removes the old authenticator and starts a new enrollment.

If you lose the authenticator for a test user, delete that user's TOTP rows (see `docs/auth-contract.md`) and sign in again to re-enroll.
