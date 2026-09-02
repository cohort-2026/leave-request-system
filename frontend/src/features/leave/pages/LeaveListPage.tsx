import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { leaveDetailPath, paths } from '../../../shared/constants/paths'

export function LeaveListPage() {
  return (
    <PageShell title="My leave" eyebrow="Staff · manager · company admin">
      <p className="muted">This person’s leave requests only. Lists are wired later.</p>
      <p className="actions">
        <Link to={paths.leaveNew}>Book leave</Link>
        <Link to={leaveDetailPath('demo')}>Open a sample request</Link>
      </p>
    </PageShell>
  )
}
