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
```

`003_login_totp.sql` adds login challenges, encrypted TOTP secrets, and hashed recovery codes. It also drops `login_otp_tokens` if that table exists from an earlier emailed-OTP experiment.

`004_email_verification.sql` adds hashed email-verification tokens. New registrations are `pending_verification` until the emailed link is consumed. Seeded demo users stay `active`.

`005_password_reset.sql` adds hashed password-reset tokens. Forgot-password emails a one-hour link. Reset does not sign the user in.

`006_totp_reset.sql` adds hashed authenticator-reset tokens. The signed-in profile emails a one-hour link. TOTP is not removed until the link is consumed.

`007_companies.sql` adds the `companies` table and `users.company_id` (issue 96). It backfills Acme, keeps `company_name` as a display copy, and seeds Khumalo Retail (`admin.khumalo@leave.local`). Authorization still uses `company_name` until issue 97.

`008_onboarding_links.sql` adds hashed company invite tokens (issues 101 and 102). One active link per company (`disabled_at IS NULL`). The raw token is never stored. Until issue 97, the table keys off `users.company_name`.

`009_billing.sql` adds ZAR `plans`, `subscriptions`, `invoices`, and `signup_checkouts`. Signup stores a checkout first; mock-pay creates the company, an `active` subscription, and a paid invoice. Demo companies are backfilled onto Starter `active`.

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
