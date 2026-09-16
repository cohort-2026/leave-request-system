# Leave / Employee Request Management System

## Project Status

**Current Phase:** Planning

---

## Start Here

**Do not start coding yet.**

Before beginning development, your team must read the central
**Intern Project Planning Guide** and complete all five planning
deliverables.

👉 [Read the Intern Project Planning Guide](https://github.com/cohort-2026/intern-programme/blob/main/planning-guide.md)

Your team will be expected to understand the client's problem,
identify stakeholders and users, define requirements, create
user stories and acceptance criteria, and create user flows.

Development may only begin once the planning phase has been
reviewed and approved by your mentor.

---

## Client Brief

Please read the client brief carefully.

We are a company with multiple employees who need to submit requests to the business, including requests relating to leave.

At the moment, employees submit requests through email, WhatsApp and other communication channels.

As the company grows, we would like a more organized way of handling these requests and keeping track of decisions that have been made.

Employees should have better visibility of requests they have submitted, while the appropriate people within the company should be able to review and manage them.

We are open to your team's recommendations on how the system should work.

---

## Planning Deliverables

Your team must complete:

1. Problem Understanding
2. Stakeholders and Users
3. System Requirements
4. User Stories and Acceptance Criteria
5. User Flows

See the [full Planning Guide](https://github.com/cohort-2026/intern-programme/blob/main/planning-guide.md)
for detailed instructions.

---

## Team

**Leave Request Team**

[View team on GitHub](https://github.com/orgs/cohort-2026/teams/leave-request-team)

---

## Documentation

Your project documentation should be stored inside the `docs/`
directory.

The client brief is available here:

`docs/client-brief.md`

---

## Development

The app is split into two TypeScript packages:

- `backend/` — Express API on port 4000
- `frontend/` — Vite + React on port 5173

### Install

Lockfiles are committed. `node_modules/` is gitignored in the root, `frontend/`, and `backend/`. Do not commit `node_modules`.

From the repo root, on a known-good lockfile:

```powershell
npm ci
npm run ci:all
```

`npm ci` installs exactly what each lockfile specifies. Use `npm install` only when adding or updating a package.

If code imports a package (`import ... from "react-router-dom"`), that package must already be in the matching `package.json`. Add the import and the install in the same change:

```powershell
npm install <pkg> --prefix frontend
```

or `--prefix backend`. Never add an import without installing it there.

### Run both

From the repo root, after install:

```powershell
npm run dev
```

Or start them in two terminals with `npm run dev` inside `backend/` and `frontend/`.

Check:

- http://localhost:4000/api/health → `{ "ok": true }`
- http://localhost:5173 → Vite React app

See `Start Servers.md` for the same commands.

### Local email (Mailpit)

There is no production mail domain. Transactional mail is sent over SMTP to **Mailpit** and viewed in its UI.

- SMTP: `127.0.0.1:1025` (no auth, no TLS)
- UI: http://localhost:8025

Start Mailpit (pick one), then prove the mailer:

```powershell
winget install --id axllent.mailpit -e
mailpit
```

```powershell
docker run --rm -p 8025:8025 -p 1025:1025 axllent/mailpit
```

```powershell
npm run mail:test --prefix backend
```

Copy SMTP keys from `backend/.env.example` into `backend/.env` if you want them explicit; the mailer already defaults to Mailpit. See `Start Servers.md` for the same steps.
