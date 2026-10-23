# Users table and seed logins

Apply from `backend/` after `DATABASE_URL` is set:

```sh
psql "$DATABASE_URL" -f sql/001_users.sql
psql "$DATABASE_URL" -f sql/002_seed_users.sql
psql "$DATABASE_URL" -f sql/003_login_totp.sql
psql "$DATABASE_URL" -f sql/004_email_verification.sql
psql "$DATABASE_URL" -f sql/005_password_reset.sql
psql "$DATABASE_URL" -f sql/006_totp_reset.sql
# 007_companies.sql is issue 96. Apply it before 008.
psql "$DATABASE_URL" -f sql/008_onboarding_links.sql
```

`003_login_totp.sql` adds login challenges, encrypted TOTP secrets, and hashed recovery codes. It also drops `login_otp_tokens` if that table exists from an earlier emailed-OTP experiment.

`004_email_verification.sql` adds hashed email-verification tokens. New registrations are `pending_verification` until the emailed link is consumed. Seeded demo users stay `active`.

`005_password_reset.sql` adds hashed password-reset tokens. Forgot-password emails a one-hour link. Reset does not sign the user in.

`006_totp_reset.sql` adds hashed authenticator-reset tokens. The signed-in profile emails a one-hour link. TOTP is not removed until the link is consumed.

`007_companies.sql` is issue 96 (companies tenancy). It is not in this folder yet. `008_onboarding_links.sql` needs that table: `company_id` references `companies (id)`.

`008_onboarding_links.sql` adds hashed company invite tokens (issue 101). One active link per company (`disabled_at IS NULL`). The raw token is never stored. Billing SQL is not present, so this file is 008 rather than 009.

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
