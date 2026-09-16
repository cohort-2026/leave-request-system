# Users table and seed logins

Apply from `backend/` after `DATABASE_URL` is set:

```sh
psql "$DATABASE_URL" -f sql/001_users.sql
psql "$DATABASE_URL" -f sql/002_seed_users.sql
psql "$DATABASE_URL" -f sql/003_login_totp.sql
psql "$DATABASE_URL" -f sql/004_email_verification.sql
```

`003_login_totp.sql` adds login challenges, encrypted TOTP secrets, and hashed recovery codes. It also drops `login_otp_tokens` if that table exists from an earlier emailed-OTP experiment.

`004_email_verification.sql` adds hashed email-verification tokens. New registrations are `pending_verification` until the emailed link is consumed. Seeded demo users stay `active`.

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
