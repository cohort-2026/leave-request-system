import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Button } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { roleLabel } from '../../../shared/types/session'

export function HomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  if (!session) {
    return <Navigate to={paths.login} replace />
  }

  if (session.role === 'platform') {
    return <Navigate to={paths.platform} replace />
  }

  return (
    <PageShell
      title="Home"
      eyebrow={roleLabel[session.role]}
      action={
        <Button
          variant="primary"
          type="button"
          onClick={() => navigate(paths.leaveNew)}
        >
          Book leave
        </Button>
      }
    >
      {session.role === 'staff' ? (
        <p className="text-muted">My leave, remaining days, and a way to book leave.</p>
      ) : null}
      {session.role === 'manager' ? (
        <p className="text-muted">
          How many team requests are waiting, plus a way to book your own leave.
        </p>
      ) : null}
      {session.role === 'company_admin' ? (
        <p className="text-muted">
          Claims still waiting, company requests, and shortcuts to setup.
        </p>
      ) : null}
      <p className="flex flex-wrap gap-stack">
        <Link to={paths.leave}>My leave</Link>
        <Link to={paths.leaveNew}>Book leave</Link>
        <Link to={paths.calendar}>Calendar</Link>
        {session.role === 'manager' || session.role === 'company_admin' ? (
          <Link to={paths.teamQueue}>Team queue</Link>
        ) : null}
        {session.role === 'company_admin' ? (
          <>
            <Link to={paths.adminApprovals}>Approvals</Link>
            <Link to={paths.adminRules}>Company rules</Link>
            <Link to={paths.adminImport}>Import</Link>
          </>
        ) : null}
      </p>
    </PageShell>
  )
}
