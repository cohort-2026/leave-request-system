import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { adminUserPath } from '../../../shared/constants/paths'

export function UsersPage() {
  return (
    <PageShell title="People" eyebrow="Company admin">
      <p className="muted">
        Everyone in this company: claimed, not claimed, and still waiting.
      </p>
      <p>
        <Link to={adminUserPath('demo')}>Open a sample person</Link>
      </p>
    </PageShell>
  )
}
