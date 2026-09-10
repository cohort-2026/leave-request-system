# Auth & roles

## 401 vs 403

- **401** — we don't know who you are. No cookie, or the cookie is invalid/expired. Handled by `requireAuth`.
- **403** — we know who you are, and the answer is no. Signed in, wrong role. Handled by `requireRole`.
- A missing cookie is never a 500. It's a 401.

## Public routes (on purpose)

These routes accept unauthenticated requests. No checkpoint is applied.

| Method | Path                | Notes                                                        |
| ------ | ------------------- | ------------------------------------------------------------- |
| GET    | `/api/health`       | Liveness check.                                                |
| POST   | `/api/auth/register`| **Not implemented yet.** Reserve as public when it's built.   |
| POST   | `/api/auth/login`   | Issues the session cookie.                                     |
| POST   | `/api/auth/logout`  | Left public on purpose — clearing a cookie that isn't valid/present shouldn't 401. It's a harmless no-op for a signed-out caller. |

## Every current server address (access decision)

| Method | Path                | Checkpoint                          | Who                        |
| ------ | ------------------- | ------------------------------------ | -------------------------- |
| GET    | `/api/health`       | none                                  | public                     |
| POST   | `/api/auth/login`   | none                                  | public                     |
| POST   | `/api/auth/logout`  | none                                  | public                     |
| GET    | `/api/auth/me`      | `requireAuth`                         | any signed-in role         |
| GET    | `/api/ping/signed-in` | `requireAuth`                       | any signed-in role         |
| GET    | `/api/ping/admin`   | `requireAuth`, `requireRole("company_admin")` | `company_admin` only |

Nothing above is unmarked — every address that exists right now has a checkpoint decision, even if that decision is "public."

## Roles

Four roles, from `session.ts`: `staff`, `manager`, `company_admin`, `platform`.

## Screens → allowed roles (draft, not yet confirmed against Monday contract)

This is a proposed access table for screens that don't have server routes yet, so later work can reuse `requireAuth`/`requireRole` instead of inventing new checkpoints. **Flagging this as a draft** — I don't have the actual Monday contract, so the "who's allowed" calls below are reasonable guesses based on the role names, not settled decisions. Please confirm with the team (especially Member 5, since they own the website buttons) before building against it.

| Screen       | Allowed roles (proposed)                | Reasoning (guess)                                  |
| ------------ | ---------------------------------------- | --------------------------------------------------- |
| Home         | staff, manager, company_admin, platform  | Landing page for any signed-in user.                |
| My leave     | staff, manager, company_admin, platform  | Everyone manages their own leave requests.          |
| Team queue   | manager, company_admin                   | Reviewing/approving a team's requests — not `staff`.|
| People       | company_admin                            | Managing company users/roles — admin-level.         |
| Platform     | platform                                 | Cross-company/platform-level administration.        |

**Needs confirmation:** whether `platform` should also reach Team queue / People (cross-company oversight), and whether `manager` needs anything beyond Team queue. These are the calls the Monday contract should settle — don't build against this table as final without checking.
