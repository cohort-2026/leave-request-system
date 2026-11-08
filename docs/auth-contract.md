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

 the caller's company. Staff, manager, and `company_admin` with a `company_id`. Platform and anyone without a company get **403**.

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

Body: `{ "token" }` (the secret from the emailed link). Verifies the email token constraint value.

### `GET /api/companies/current/sso` — `company_admin`

Retrieves the active OIDC / Single Sign-On configuration parameters for the caller's company space. Never returns the raw client secret.

- 200 `{ "issuer": "https://...", "clientId": "...", "emailDomain": "example.com", "enabled": true }` or `{ "issuer": null, "clientId": null, "emailDomain": null, "enabled": false }`
- 401 `{ "error": "Not signed in" }`
- 403 staff, manager, platform, or a company admin with no company

### `PUT /api/companies/current/sso` — `company_admin`

Saves or overrides OIDC integration parameters for the company workspace.

- Body: `{ "issuer", "clientId", "clientSecret", "emailDomain", "enabled" }`
- 200 `{ "message": "SSO settings updated successfully" }`
- 400 missing required parameters or malformed fields
- 401 / 403 as for GET

### `GET /api/auth/sso/start` — anyone

Initiates the multi-tenant OIDC authorization code pipeline redirect chain.

- Query Parameter: `?company=` (takes a company slug string or registered email domain)
- 302 Redirect to the matched identity provider authorization portal
- 400 missing company target parameter, or SSO is not enabled/configured for this provider

### `GET /api/auth/sso/callback` — anyone

Handles incoming identity provider code assertions, matches users cleanly by email, and issues session tokens directly—completely skipping local password verification and TOTP controls.

- Query Parameters: `?code=&state=`
- 302 Redirect to frontend core application workspace hub (`http://localhost:5173/`) with a valid `lrs_session` cookie set.
- 400 malformed state signature or code assertion validation mismatch
