import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/useAuth'
import { onboardPath, paths } from '../../../shared/constants/paths'
import type { Session } from '../../../shared/types/session'
import { PageShell } from '../../../app/layouts/PageShell'

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
      <p className="muted">
        Looks up the person. Does not create a company. Walkthrough buttons
        stand in for Express auth so the team can click every route.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label>
          Email
          <input type="email" name="email" autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" name="password" autoComplete="current-password" />
        </label>
        <button type="submit" disabled>
          Log in (wired later)
        </button>
      </form>
      <div className="stack">
        <p>Open the app as</p>
        <div className="actions">
          {demos.map((demo) => (
            <button
              key={demo.label}
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
            </button>
          ))}
        </div>
        <p className="muted">Staff · {demos[0].hint}</p>
      </div>
      <p>
        <Link to={onboardPath('demo-token')}>Claim a staff number</Link>
        {' · '}
        <Link to={paths.onboardDisabled}>Invite is off</Link>
      </p>
    </PageShell>
  )
}
