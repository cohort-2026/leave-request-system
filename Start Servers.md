# How to start the backend and frontend

Install once from the repo root (`leave-request-system`) using the committed lockfiles:

```powershell
npm ci
npm run ci:all
```

Then start both:

```powershell
npm run dev
```

- Backend: http://localhost:4000/api/health
- Frontend: http://localhost:5173

`Ctrl+C` stops both.

# How to start the backend or frontend separately

Backend:

```powershell
cd backend
npm run dev
```

Frontend (second terminal):

```powershell
cd frontend
npm run dev
```

# Authenticator login (TOTP)

After email + password, the app asks for a Google Authenticator (or any TOTP) code. First login shows a QR + secret; later logins only ask for the 6-digit code. Mailpit is **not** used for this step.

# How to run Mailpit (local email)

Verification and password-reset mail have no production domain. The API sends SMTP to Mailpit. Open http://localhost:8025 to read captured messages. Login codes are **not** emailed.

Forgot password: `/forgot-password` emails a one-hour link to `/reset-password?token=...`. A successful reset does **not** sign the person in; they still need password + authenticator.

Signed-in profile (`/profile`): change display name, change password (stays signed in), or email an authenticator reset to `/reset-authenticator?token=...`. TOTP stays in place until that link is used.

SMTP defaults (also in `backend/.env.example`): `127.0.0.1:1025`, no auth, no TLS.

Binary (Windows):

```powershell
winget install --id axllent.mailpit -e
mailpit
```

Docker:

```powershell
docker run --rm -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Prove the mailer (Mailpit must already be running):

```powershell
npm run mail:test --prefix backend
```

The test message is sent through `backend/mail`. Auth routes do not contain SMTP details.
