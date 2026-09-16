# Sign-in contract

Monday Week 4 agreement. Errors are always `{ "error": "..." }`.

| Status | Meaning |
| --- | --- |
| 400 | Bad input |
| 401 | Not signed in, or login failed |
| 403 | Signed in, not allowed |
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

Body: `{ "email", "password" }`. Extra fields such as `role` are ignored. New users are always `staff`. Does **not** set a cookie; go to login next.

- 201 public user
- 400 missing / invalid email, empty, shorter than 8, or longer than 1024
- 409 email already used

### `POST /api/auth/login` — anyone

Body: `{ "email", "password" }`. Success sets the cookie and returns the public user.

Wrong password and unknown email both return **401** `{ "error": "Invalid email or password" }`.

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

Seeded users are `active`. Minimum password length is 8. Roles are `staff`, `manager`, `company_admin`, `platform`.

See `docs/auth-roles.md` for who may call which address.

## Transactional email

Local development only. The API sends mail through `backend/mail` using `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `MAIL_FROM`. Defaults point at Mailpit (`127.0.0.1:1025`, UI `http://localhost:8025`). There is no production mail provider yet.

Auth routes must not contain SMTP details. Verification and password-reset mail are not sent yet; this is the shared mailer only.
