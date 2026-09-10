import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/useAuth'
import { onboardPath, paths } from '../../../shared/constants/paths'
import type { Session } from '../../../shared/types/session'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'

const demos: { label: string; hint: string; session: Session }[] = [
  {
    label: 'Staff',
    hint: 'Home, my leave, book leave, calendar',
    session: {
      displayName: 'Thandi Nkosi',
      role: 'staff',
      status: 'active',
      companyName: 'Acme',
    },
  },
  {
    label: 'Manager',
    hint: 'Team queue plus own leave',
    session: {
      displayName: 'Sipho Dlamini',
      role: 'manager',
      status: 'active',
      companyName: 'Acme',
    },
  },
  {
    label: 'Company admin',
    hint: 'People, rules, import, approvals',
    session: {
      displayName: 'Lebo Maseko',
      role: 'company_admin',
      status: 'active',
      companyName: 'Acme',
    },
  },
  {
    label: 'Platform',
    hint: 'Company list only',
    session: {
      displayName: 'Platform operator',
      role: 'platform',
      status: 'active',
      companyName: null,
    },
  },
  {
    label: 'Waiting for approval',
    hint: 'Signed in, leave still closed',
    session: {
      displayName: 'New hire',
      role: 'staff',
      status: 'pending_approval',
      companyName: 'Acme',
    },
  },
  {
    label: 'Email not verified',
    hint: 'Opens the verify page',
    session: {
      displayName: 'Unverified user',
      role: 'staff',
      status: 'pending_verification',
      companyName: 'Acme',
    },
  },
]

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  return (
    <PageShell title="Sign in" eyebrow="Public">
      <Alert tone="info">
        Looks up the person. Does not create a company. Walkthrough buttons
        stand in for Express auth so the team can click every route.
      </Alert>
      <form
        className="flex flex-col gap-stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        <Button variant="primary" type="submit" disabled>
          Log in (wired later)
        </Button>
      </form>
      <div className="flex flex-col gap-stack">
        <p className="text-body">Open the app as</p>
        <div className="flex flex-wrap gap-stack">
          {demos.map((demo) => (
            <Button
              key={demo.label}
              variant="secondary"
              type="button"
              onClick={() => {
                signIn(demo.session)
                if (demo.session.status === 'pending_verification') {
                  navigate(paths.verify)
                  return
                }
                if (demo.session.status === 'pending_approval') {
                  navigate(paths.pendingApproval)
                  return
                }
                navigate(demo.session.role === 'platform' ? paths.platform : paths.home)
              }}
            >
              {demo.label}
            </Button>
          ))}
        </div>
        <p className="text-muted">Staff · {demos[0].hint}</p>
      </div>
      <p>
        <Link to={onboardPath('demo-token')}>Claim a staff number</Link>
        {' · '}
        <Link to={paths.onboardDisabled}>Invite is off</Link>
      </p>
    </PageShell>
  )
}
