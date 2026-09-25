# Auth and roles

401 means not signed in. 403 means signed in but not allowed. Hiding a button is not security — these checkpoints run on the server.

| Address | Who may call it |
| --- | --- |
| `GET /api/health` | Anyone (no login) |
| `POST /api/auth/register` | Anyone (no login) |
| `POST /api/auth/login` | Anyone (no login). Unverified accounts get **403** and no cookie. |
| `POST /api/auth/verify-email` | Anyone (no login). Token from the emailed link. |
| `POST /api/auth/resend-verification` | Anyone (no login). Same success whether the email exists or not. |
| `POST /api/auth/forgot-password` | Anyone (no login). Same success whether the email exists or not. |
| `POST /api/auth/reset-password` | Anyone (no login). Token from the emailed link. Does not set a session. |
| `POST /api/auth/login/totp/enroll` | Anyone with a valid `lrs_mfa` enroll challenge |
| `POST /api/auth/login/totp` | Anyone with a valid `lrs_mfa` login challenge |
| `POST /api/auth/logout` | Anyone (idempotent; no cookie still returns 200) |
| `GET /api/auth/me` | Any signed-in role (`requireAuth`) |
| `GET /api/ping/signed-in` | Any signed-in role (`requireAuth`) |
| `GET /api/ping/admin` | `company_admin` or `platform` (`requireAuth` + `requireRole`) |
| `GET /api/users/:id` | Owner of that row, or `manager` / `company_admin` in the same company, or `platform`. Staff may not read another id. Failed checks are **403**. Missing rows are **404**. `password_hash` is never returned. |

Roles are `staff`, `manager`, `company_admin`, `platform`. There is no generic `admin` role.

There is no people/team table this week, so same-company for manager / company_admin is `users.company_name`. Platform can read any row.
