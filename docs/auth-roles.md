# Auth and roles

401 means not signed in. 403 means signed in but not allowed. Hiding a button is not security — these checkpoints run on the server.

| Address | Who may call it |
| --- | --- |
| `GET /api/health` | Anyone (no login) |
| `POST /api/auth/register` | Anyone (no login). Always **400**; open staff signup is closed. |
| `GET /api/billing/plans` | Anyone (no login). Public ZAR catalog. |
| `POST /api/companies/signup` | Anyone (no login). Creates a payment checkout, not a company. |
| `POST /api/companies/signup/mock-pay` | Anyone (no login), local only. Completes checkout and creates the company admin. No session cookie. |
| `POST /api/auth/onboard` | Anyone (no login). Token must be an active company invite. Creates `staff` in that company only. |
| `GET /api/companies/current/users` | `company_admin` of a company. Same-company people only. |
| `GET /api/companies/current/onboarding-link` | `company_admin` of a company (`requireAuth` + `requireRole`). Does not return the raw token. |
| `POST /api/companies/current/onboarding-link` | `company_admin` of a company. Creates or rotates the hashed invite URL. |
| `POST /api/companies/current/onboarding-link/disable` | `company_admin` of a company. |
| `POST /api/auth/login` | Anyone (no login). Unverified accounts get **403** and no cookie. |
| `POST /api/auth/verify-email` | Anyone (no login). Token from the emailed link. |
| `POST /api/auth/resend-verification` | Anyone (no login). Same success whether the email exists or not. |
| `POST /api/auth/forgot-password` | Anyone (no login). Same success whether the email exists or not. |
| `POST /api/auth/reset-password` | Anyone (no login). Token from the emailed link. Does not set a session. |
| `POST /api/auth/login/totp/enroll` | Anyone with a valid `lrs_mfa` enroll challenge |
| `POST /api/auth/login/totp` | Anyone with a valid `lrs_mfa` login challenge |
| `POST /api/auth/logout` | Anyone (idempotent; no cookie still returns 200) |
| `GET /api/auth/me` | Any signed-in role (`requireAuth`) |
| `PATCH /api/auth/me` | Any signed-in role. Updates only that user's `display_name`. |
| `POST /api/auth/change-password` | Any signed-in role. Requires the current password. Stays signed in. |
| `POST /api/auth/totp/reset-request` | Any signed-in role. Emails a link; does not wipe TOTP yet. |
| `POST /api/auth/totp/reset-confirm` | Anyone (no login). Token from the emailed link. Wipes TOTP. |
| `GET /api/auth/totp/enrollment` | Any signed-in role with a pending enroll challenge |
| `POST /api/auth/totp/enroll` | Any signed-in role with a valid `lrs_mfa` enroll challenge |
| `GET /api/ping/signed-in` | Any signed-in role (`requireAuth`) |
| `GET /api/ping/admin` | `company_admin` or `platform` (`requireAuth` + `requireRole`) |
| `GET /api/users/:id` | Owner of that row, or `manager` / `company_admin` in the same company, or `platform`. Staff may not read another id. Failed checks are **403**. Missing rows are **404**. `password_hash` is never returned. |
| `PATCH /api/users/:id/role` | `company_admin` of a company. Same-company target only. Cannot change own role, assign `platform`, change a `platform` user, or demote the last `company_admin`. |

Roles are `staff`, `manager`, `company_admin`, `platform`. There is no generic `admin` role.

`companies` and `users.company_id` exist (issue 96). Same-company checks for manager / company_admin still use `users.company_name` until issue 97. Invite links and people list / role change are also keyed by `company_name` until then. Platform can read any row, is not in a company, and cannot list people or change roles. Staff join through an invite (or later SCIM / SSO), not `POST /api/auth/register`. A role change does not skip email verification or TOTP and does not set a session.
