# Sign-in contract

Monday Week 4 agreement. Errors are always `{ "error": "..." }`.

| Status | Meaning |
| --- | --- |
| 400 | Bad input |
| 401 | Not signed in, or login failed (wrong password / unknown email) |
| 403 | Signed in, not allowed. Also returned on login when the password is right but the email is not verified (no cookie is set). |
| 409 | Email already used |

Cookie name: `lrs_session`. httpOnly, Path `/`, SameSite `lax`, 7 days. Secure follows `NODE_ENV === "production"`. The token is never stored in `localStorage`.

A second cookie, `lrs_mfa`, is set after a correct password and consumed on TOTP success. httpOnly, Path `/`, SameSite `lax`, 10 minutes. It is not a session.

Public user JSON (login, register, `/me`, `GET /api/users/:id`, people list, role PATCH):

```json
{
  "id": 1,
  "email": "staff@leave.local",
  "role": "staff",
  "displayName": "Staff",
  "status": "active",
  "companyId": 1,
  "companyName": "Acme"
}
```

`companyId` is the `companies.id` for that user, or `null` for platform. `companyName` is the display copy of `companies.name`. Same-company authorization uses `companyId`, not the name string.

`password_hash` is never returned.

## Addresses

### `POST /api/auth/register` — anyone

Open staff signup is closed. This address always returns **400** and does **not** insert a user. Start a company at `/start-company` (`POST /api/companies/signup`), use company SSO, or open an invite link (`POST /api/auth/onboard`).

- 400 `{ "error": "Open registration is closed. Start a company at /start-company, use company SSO, or open an invite link from your admin." }`

### `POST /api/companies/signup` — anyone

Body: `{ "companyName", "email", "password", "displayName", "planCode" }`. Extra fields such as `role` are ignored. `planCode` is `starter` (default), `growth`, or `business`. This stores a **checkout** for one hour. It does **not** create a company or user and does **not** set a cookie. Complete it with `POST /api/companies/signup/mock-pay` (local) until a live payment sandbox is wired.

- 201 `{ checkoutToken, email, companyName, plan, amountCents, vatCents, totalCents, currency, amountLabel, vatLabel, totalLabel, expiresAt }`
- 400 missing / invalid email, empty display name, company name outside 2–80 characters, password shorter than 8 or longer than 1024, unknown plan
- 409 email already used
- 503 `{ "error": "Company signup is not available yet." }` if companies or billing SQL has not been applied

### `POST /api/companies/signup/mock-pay` — anyone, local only

Body: `{ "token" }` from the checkout. Creates the `companies` row (`status: "active"`), a `company_admin` with `status: "pending_verification"`, an `active` subscription for the chosen plan, and a paid ZAR invoice (ex-VAT + 15% VAT). Slug is derived from the company name. Does **not** set a cookie. Sends the verification email. Refused when `NODE_ENV === "production"`. Card numbers are not accepted.

- 201 public user plus `{ company, subscription, invoice }`
- 400 invalid, expired, or already completed checkout
- 409 email already used
- 500 if the verification email could not be sent (the company and user rows still exist; they can resend)
- 503 production, or tables missing

### `POST /api/auth/onboard` — anyone

Body: `{ "token", "email", "password", "displayName" }`. Extra fields such as `role` and `companyName` are ignored. The token must match one **active** company invite. New users are always `staff` in **that** company, `status: "pending_verification"`. Password rules match the old register (8–1024). Does **not** set a cookie. Sends the existing verification email (Mailpit in local dev). Then they sign in and enroll TOTP as today.

- 201 public user (`pending_verification`, `companyId` and `companyName` from the invite)
- 400 missing / invalid email, empty display name, password shorter than 8 or longer than 1024
- 400 `{ "error": "This invite link is invalid or has been disabled." }` (unknown or disabled token)
- 409 email already used
- 500 if the verification email could not be sent (the user row still exists; they can resend)
- 503 `{ "error": "Invite links are not available yet." }` if `onboarding_links` has not been applied

### `GET /api/companies/current/onboarding-link` — `company_admin`

Whether this company has an active invite link. Does **not** return the raw token (that value is only in the URL, and only when the link is created or rotated).

- 200 `{ "active": true, "createdAt": "..." }` or `{ "active": false, "createdAt": null }`
- 401 `{ "error": "Not signed in" }`
- 403 staff, manager, platform, or a company admin with no company
- 503 `{ "error": "Invite links are not available yet." }` if `onboarding_links` has not been applied

### `POST /api/companies/current/onboarding-link` — `company_admin`

Create or rotate this company's invite link. Disables any active link, stores a SHA-256 hash, and returns the public URL **once**. One active link per company.

- 201 `{ "active": true, "url": "http://localhost:5173/onboard/...", "createdAt": "..." }`
- 401 / 403 / 503 as for GET

### `POST /api/companies/current/onboarding-link/disable` — `company_admin`

Disables the active invite for this company. Idempotent if none is active. Existing tokens then fail onboard with 400.

- 200 `{ "ok": true, "active": false }`
- 401 / 403 / 503 as for GET

### `GET /api/companies/current` — signed-in company user

The caller's company. Staff, manager, and `company_admin` with a `company_id`. Platform and anyone without a company get **403**.

- 200 `{ "id", "name", "slug", "status", "trialEndsAt" }` (`trialEndsAt` may be `null`)
- 401 `{ "error": "Not signed in" }`
- 403 `{ "error": "You are not in a company" }` (platform, or no `company_id`)

### `GET /api/companies/current/users` — `company_admin`

Public user JSON for every person in **this** company (`users.company_id`). Ordered by id. Includes the caller. Does **not** include other companies or `platform` users.

- 200 `{ "users": [ public user, ... ] }`
- 401 `{ "error": "Not signed in" }`
- 403 staff, manager, platform, or a company admin with no company

### `PATCH /api/users/:id/role` — `company_admin`

Body: `{ "role" }` where `role` is `staff` | `manager` | `company_admin`. Extra fields (`email`, `status`, `companyName`, `password`, …) are ignored. Updates **only** `users.role`. Does **not** change password, TOTP, recovery codes, verification status, or company. Does **not** set or clear cookies. The existing `lrs_session` stays valid; later `requireAuth` loads the new role from the database.

- 200 public user (new role)
- 400 `{ "error": "Unknown role" }` (missing, `platform`, or any other value)
- 400 `{ "error": "Invalid user id" }`
- 401 `{ "error": "Not signed in" }`
- 403 `{ "error": "You cannot change your own role" }`
- 403 `{ "error": "Cannot demote the last company admin" }`
- 403 staff, manager, platform, other company, or a `platform` target
- 404 `{ "error": "Not found" }`

### `POST /api/auth/login` — anyone

Body: `{ "email", "password" }`.

Wrong password and unknown email both return **401** `{ "error": "Invalid email or password" }`.

Correct password on an unverified account (`pending_verification`) returns **403** `{ "error": "Email not verified. Check your inbox (Mailpit in local dev) or request a new link." }` and does **not** set a cookie.

Verified accounts (including seeded demo users) do **not** get a cookie yet. A short-lived httpOnly `lrs_mfa` challenge cookie is set instead.

- Not enrolled: **200** `{ "totpEnrollmentRequired": true, "otpauthUrl": "...", "secret": "...", "qrSvg": "..." }`. Scan the QR (or type the secret) in Google Authenticator / any RFC 6238 app, then confirm with `POST /api/auth/login/totp/enroll`.
- Enrolled: **200** `{ "totpRequired": true }`. Submit the current 6-digit code to `POST /api/auth/login/totp`, or a recovery code if the authenticator is lost.

The TOTP secret is returned only on that first enrollment payload. It is stored encrypted. The mailer is not used for this step.

### `POST /api/auth/verify-email` — anyone

Body: `{ "token" }` (the secret from the emailed link, not a hash). Consumes a single-use token, sets `status` to `active`. Does **not** set a cookie; go to login next (TOTP after password).

- 200 `{ "ok": true }`
- 400 `{ "error": "This verification link is invalid or has expired." }` (missing, used, or expired)

### `POST /api/auth/resend-verification` — anyone

Body: `{ "email" }`. Always the same success payload when the email format is valid, whether or not the account exists. Cooldown is one minute per address. Invalid format is 400.

- 200 `{ "ok": true, "message": "If that email is registered and still needs verifying, we sent a link." }`

### `POST /api/auth/forgot-password` — anyone

Body: `{ "email" }`. Always the same success payload when the email format is valid, whether or not the account exists. Cooldown is one minute per address. Invalid format is 400. Does **not** say whether mail was sent. Does **not** set a cookie.

If the account exists, a hashed one-time token is stored (1 hour TTL) and a Mailpit email is sent with `/reset-password?token=...`. Unverified accounts can still receive a reset; they still cannot sign in until they verify.

- 200 `{ "ok": true, "message": "If that email is registered, we sent a reset link." }`
- 400 `{ "error": "Invalid email format" }`

### `POST /api/auth/reset-password` — anyone

Body: `{ "token", "password" }` (the secret from the emailed link, not a hash). Password length matches register (8–1024). Consumes the token, bcrypt-hashes the new password, and invalidates any other unused reset tokens for that user. Open login challenges for that user are dropped so MFA after the old password cannot finish. Does **not** set a session cookie; go to login next (TOTP after password). Authenticator enrollment is unchanged.

Reused or expired tokens return 400. A too-short password does not consume the token.

- 200 `{ "ok": true }`
- 400 `{ "error": "This reset link is invalid or has expired." }`
- 400 `{ "error": "Password must be at least 8 characters" }`
- 400 `{ "error": "Email or password too long" }`

### `POST /api/auth/login/totp/enroll` — anyone (after password, not enrolled)

Body: `{ "email", "code" }` (6 digits) plus the `lrs_mfa` cookie. Persists TOTP only after a valid code. Success sets `lrs_session`, clears `lrs_mfa`, and returns the public user plus `recoveryCodes` (plain strings, shown once).

- 200 public user + `recoveryCodes`
- 400 `{ "error": "This authenticator code is invalid or has expired." }`

### `POST /api/auth/login/totp` — anyone (after password, enrolled)

Body: `{ "email", "code" }` **or** `{ "email", "recoveryCode" }` (not both), plus the `lrs_mfa` cookie. Password cannot be skipped: there is no way to finish login with only email + TOTP.

A valid 6-digit code sets `lrs_session` and returns the public user.

A valid recovery code means the authenticator is lost. It does **not** set a session. The old TOTP secret and remaining recovery codes are deleted, a new enroll challenge is issued, and the response is the same shape as first-time enrollment plus `totpReset: true`. Confirm the new authenticator with `POST /api/auth/login/totp/enroll` (new recovery codes are shown once).

TOTP is RFC 6238 (SHA-1, 6 digits, 30s, ±1 period). The same 30s window cannot be reused. Five failed TOTP guesses lock the factor for 15 minutes. Recovery codes are hashed; each works once.

- 200 public user (6-digit code)
- 200 `{ "totpEnrollmentRequired": true, "totpReset": true, "otpauthUrl": "...", "secret": "...", "qrSvg": "..." }` (recovery code)
- 400 `{ "error": "This authenticator code is invalid or has expired." }`

### `GET /api/auth/me` — signed in

Returns the public user. Missing or bad cookie: **401** `{ "error": "Not signed in" }`.

### `PATCH /api/auth/me` — signed in

Body: `{ "displayName" }`. Updates **only** the caller's `display_name`. Extra fields such as `role`, `companyName`, `status`, and `email` are ignored. Empty / whitespace-only name stores `null` (the public JSON then falls back to the email). Max length 120.

- 200 public user (new `displayName`)
- 400 `{ "error": "Display name required" }`
- 400 `{ "error": "Display name is too long" }`
- 401 `{ "error": "Not signed in" }`

### `POST /api/auth/change-password` — signed in

Body: `{ "currentPassword", "newPassword" }`. Length rules match register (8–1024), bcrypt cost 10. Wrong current password does **not** change the hash. Success **keeps** `lrs_session` on this browser. Open login challenges for that user are dropped. Does **not** use `password_reset_tokens` or Mailpit. Public forgot/reset is unchanged.

- 200 `{ "ok": true }`
- 400 `{ "error": "Current password and new password required" }`
- 400 `{ "error": "Password must be at least 8 characters" }`
- 400 `{ "error": "Email or password too long" }`
- 400 `{ "error": "Current password is incorrect" }`
- 401 `{ "error": "Not signed in" }`

### `POST /api/auth/totp/reset-request` — signed in

No body. Emails a one-time link to the account address (`/reset-authenticator?token=...`). Cooldown is one minute per user. Does **not** wipe TOTP until the link is consumed. Uses `totp_reset_tokens` (hashed, 1 hour TTL). Does **not** reuse `password_reset_tokens` or `email_verification_tokens`.

- 200 `{ "ok": true, "message": "Check your inbox (Mailpit in local dev) for a link to reset your authenticator." }`
- 401 `{ "error": "Not signed in" }`
- 500 `{ "error": "Could not send authenticator reset email" }`

### `POST /api/auth/totp/reset-confirm` — anyone

Body: `{ "token" }` (the secret from the emailed link, not a hash). Consumes the token, deletes `user_totp` and remaining `totp_recovery_codes` for that user. Does **not** clear `lrs_session`.

If the request has a valid session for **that same user**, a new enroll challenge is issued (`lrs_mfa`) and the response is the login enrollment payload plus `totpReset: true`. Confirm the new authenticator with `POST /api/auth/totp/enroll`. If there is no matching session, TOTP is still wiped and the next login uses the not-enrolled path.

Reused or expired tokens return 400.

- 200 `{ "totpEnrollmentRequired": true, "totpReset": true, "otpauthUrl": "...", "secret": "...", "qrSvg": "..." }` (signed in as that user)
- 200 `{ "ok": true, "totpReset": true }` (no matching session)
- 400 `{ "error": "This authenticator reset link is invalid or has expired." }`

### `GET /api/auth/totp/enrollment` — signed in

Returns the pending enrollment payload after a signed-in authenticator reset. **404** when nothing is pending.

### `POST /api/auth/totp/enroll` — signed in (after profile reset)

Body: `{ "code" }` (6 digits) plus the `lrs_mfa` enroll challenge. Persists TOTP only after a valid code. Keeps `lrs_session`. Returns the public user plus `recoveryCodes` (plain strings, shown once).

- 200 public user + `recoveryCodes`
- 400 `{ "error": "This authenticator code is invalid or has expired." }`
- 401 `{ "error": "Not signed in" }`

### `POST /api/auth/logout` — anyone

Clears the cookie. Returns `{ "ok": true }` even when there is no cookie.

## Libraries

- Hashing: **bcrypt** (`bcrypt.hash(password, 10)`).
- Token: **jsonwebtoken**.
- Cookie: **cookie-parser**.
- Database: **pg**.
- TOTP: **otpauth** (RFC 6238). Secrets encrypted at rest (AES-256-GCM).

Rejected: putting the session in `localStorage` (any script can read it). Rejected: rolling our own hash. Rejected: Supabase Auth (this repo is Express + PostgreSQL).

Seeded users are `active` (no verification link) but still enroll TOTP on first login, then need an authenticator code on later logins. New registrations are `pending_verification` until they consume the emailed link, then TOTP on first login. Minimum password length is 8. Roles are `staff`, `manager`, `company_admin`, `platform`.

To clear TOTP for a local test user (lost phone; not a product API):

```sql
DELETE FROM totp_recovery_codes
WHERE user_id = (SELECT id FROM users WHERE email = 'staff@leave.local');
DELETE FROM user_totp
WHERE user_id = (SELECT id FROM users WHERE email = 'staff@leave.local');
DELETE FROM login_challenges
WHERE user_id = (SELECT id FROM users WHERE email = 'staff@leave.local');
```

### `GET /api/companies/current/sso` — `company_admin`

Never returns the raw client secret. Empty settings when none are saved.

- 200 `{ "issuer", "clientId", "emailDomain", "enabled", "clientSecretConfigured" }`
- 401 `{ "error": "Not signed in" }`
- 403 staff, manager, platform, or a company admin with no company

### `PUT /api/companies/current/sso` — `company_admin`

Body: `{ "issuer", "clientId", "clientSecret?", "emailDomain", "enabled" }`. The secret is encrypted at rest (`client_secret_cipher`). Leave `clientSecret` blank to keep the stored value. A first save needs a secret.

- 200 same shape as GET
- 400 missing issuer / client id / email domain, or missing secret on first save
- 401 / 403 as for GET

### `POST /api/auth/sso/start` — anyone

Body: `{ "identifier" }` (company slug such as `acme`, or a work email such as `staff@leave.local`). Local/dev mock only (`NODE_ENV !== "production"`, same gate as mock-pay). SSO users skip password and TOTP; the session cookie is still `lrs_session`.

- 200 `{ "authorizationUrl" }` pointing at this app’s mock authorize page
- 400 missing identifier
- 404 company unknown or SSO disabled
- 503 in production (no live IdP redirect)

`GET /api/auth/sso/start?company=` does the same lookup and **302**s to that URL.

### `GET /api/auth/sso/callback` — anyone

Mock OIDC callback. Validates `code` + `state`, matches the email to an existing user in **that** company, sets `lrs_session`, redirects to `APP_ORIGIN`. Does **not** JIT-create users. Does **not** run app password or TOTP.

- 302 to `/` with `lrs_session`
- 403 `{ "error": "Ask your admin to provision your account." }` when the email is not provisioned in that company
- 403 cross-company email (Khumalo cannot finish Acme’s callback)
- 503 in production

See `docs/auth-roles.md` for who may call which address.

## Transactional email

Local development only. The API sends mail through `backend/mail` using `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `MAIL_FROM`. Defaults point at Mailpit (`127.0.0.1:1025`, UI `http://localhost:8025`). There is no production mail provider yet.

Auth routes must not contain SMTP details. Register and resend send the verification template through `backend/mail`. Forgot-password sends the reset template through `backend/mail`. Signed-in authenticator reset sends the authenticator-reset template through `backend/mail`. Login uses authenticator TOTP, not emailed codes.
