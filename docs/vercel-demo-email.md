# Email for the controlled Vercel demo

The backend already sends mail through Nodemailer and SMTP. For this small,
controlled demo, Mailgun's sandbox can send verification, password-reset,
authenticator-reset, onboarding, and leave-notification emails to recipients
you have authorized in Mailgun. It is not suitable for unrestricted signups or
general production use.

## Configure Mailgun

1. Create a Mailgun account and open its sandbox domain.
2. Add each demo tester's email address as an authorized recipient and complete
   any verification Mailgun requests.
3. Copy the sandbox SMTP credentials and the SMTP host for the sandbox's
   region from Mailgun. Do not use the HTTP API key as the SMTP password.
4. Use the sandbox domain's permitted sender address for `MAIL_FROM`.

## Set Vercel environment variables

Add these in the Vercel project's **Settings → Environment Variables** for the
Preview environment used by the demo. These are server-side variables; never
add SMTP credentials to frontend `VITE_` variables or commit them to the
repository.

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | Mailgun's SMTP host for the sandbox region |
| `SMTP_PORT` | Port from Mailgun; usually `587` |
| `SMTP_SECURE` | `false` for port 587 with STARTTLS; follow the settings shown by Mailgun |
| `SMTP_USER` | Sandbox SMTP username |
| `SMTP_PASS` | Sandbox SMTP password |
| `MAIL_FROM` | A sender address allowed by the sandbox domain |
| `APP_ORIGIN` | The deployed frontend URL, e.g. `https://your-app.vercel.app` |

Also set `DATABASE_URL` and `JWT_SECRET`. Production mode refuses to use local
Mailpit defaults if SMTP credentials or `APP_ORIGIN` are missing. Redeploy
after changing Vercel environment variables.

The repository root is configured as one Vercel project with two services:
`frontend` (Vite) and `backend` (Express). In Vercel's project setup, use the
repository root (`.`) as the Root Directory. Requests under `/api/` route to
the backend unchanged; all other paths route to the frontend, whose rewrite
supports React Router deep links. Both services share the same public origin,
so session cookies work without cross-origin cookie configuration. The
frontend makes browser requests through the public `/api/` route, so no
service-to-service binding is needed. Each service installs from its own
lockfile and runs its own build command, so the backend's runtime dependencies
are included with the Express service.

Vercel Functions have ephemeral local storage. Leave request supporting files
are written to `/tmp` on Vercel and won't persist across invocations, so file
uploads need durable object storage before relying on them in this deployment.

## Send a test message

From the repository root, pass an authorized Mailgun sandbox recipient:

```powershell
npm run mail:test --prefix backend -- tester@example.com
```

For local development, the existing Mailpit defaults are unchanged:
`127.0.0.1:1025`, no authentication, and no TLS. Local `.env` values override
the example settings.
