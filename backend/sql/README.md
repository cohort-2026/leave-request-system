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
psql "$DATABASE_URL" -f sql/012_company_leave_rules.sql
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

`012_company_leave_rules.sql` (issue 159) creates one reviewer/minimum-notice settings row per company, applies the manager / company-admin / zero-day defaults, and backfills existing companies.

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
