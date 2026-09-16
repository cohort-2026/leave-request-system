# Sign-in contract

Monday Week 4 agreement. Errors are always `{ "error": "..." }`.

| Status | Meaning |
| --- | --- |
| 400 | Bad input |
| 401 | Not signed in, or login failed (wrong password / unknown email) |
| 403 | Signed in, not allowed. Also returned on login when the password is right but the email is not verified (no cookie is set). |
| 409 | Email already used |

Cookie name: `lrs_session`. httpOnly, Path `/`, SameSite `lax`, 7 days. Secure follows `NODE_ENV === "production"`. The token is never stored in `localStorage`.

Public user JSON (login, register, `/me`, `GET /api/users/:id`):

```json
{
  "id": 1,
  "email": "staff@leave.local",
  "role": "staff",
  "displayName": "Staff",
  "status": "active",
  "companyName": "Acme"
}
```

`password_hash` is never returned.

## Addresses

### `POST /api/auth/register` — anyone

Body: `{ "email", "password" }`. Extra fields such as `role` are ignored. New users are always `staff` with `status: "pending_verification"`. Does **not** set a cookie. Sends a verification email (Mailpit in local dev).

- 201 public user (`pending_verification`)
- 400 missing / invalid email, empty, shorter than 8, or longer than 1024
- 409 email already used
- 500 if the verification email could not be sent (the user row still exists; they can resend)

### `POST /api/auth/login` — anyone

Body: `{ "email", "password" }`. Success sets the cookie and returns the public user.

Wrong password and unknown email both return **401** `{ "error": "Invalid email or password" }`.

Correct password on an unverified account returns **403** `{ "error": "Email not verified. Check your inbox (Mailpit in local dev) or request a new link." }` and does **not** set a cookie.

Seeded demo users are `active` and can sign in without verifying.

### `POST /api/auth/verify-email` — anyone

Body: `{ "token" }` (the secret from the emailed link, not a hash). Consumes a single-use token, sets `status` to `active`. Does **not** set a cookie; go to login next.

- 200 `{ "ok": true }`
- 400 `{ "error": "This verification link is invalid or has expired." }` (missing, used, or expired)

### `POST /api/auth/resend-verification` — anyone

Body: `{ "email" }`. Always the same success payload when the email format is valid, whether or not the account exists. Cooldown is one minute per address. Invalid format is 400.

- 200 `{ "ok": true, "message": "If that email is registered and still needs verifying, we sent a link." }`

### `GET /api/auth/me` — signed in

Returns the public user. Missing or bad cookie: **401** `{ "error": "Not signed in" }`.

### `POST /api/auth/logout` — anyone

Clears the cookie. Returns `{ "ok": true }` even when there is no cookie.

## Libraries

- Hashing: **bcrypt** (`bcrypt.hash(password, 10)`).
- Token: **jsonwebtoken**.
- Cookie: **cookie-parser**.
- Database: **pg**.

Rejected: putting the session in `localStorage` (any script can read it). Rejected: rolling our own hash. Rejected: Supabase Auth (this repo is Express + PostgreSQL).

Seeded users are `active`. New registrations are `pending_verification` until they consume the emailed link. Minimum password length is 8. Roles are `staff`, `manager`, `company_admin`, `platform`.

See `docs/auth-roles.md` for who may call which address.

## Transactional email

Local development only. The API sends mail through `backend/mail` using `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `MAIL_FROM`. Defaults point at Mailpit (`127.0.0.1:1025`, UI `http://localhost:8025`). There is no production mail provider yet.

Auth routes must not contain SMTP details. Register and resend send the verification template through `backend/mail`. Password-reset mail is not sent yet.
