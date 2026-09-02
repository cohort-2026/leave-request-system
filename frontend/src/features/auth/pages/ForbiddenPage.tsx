import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { homeFor, paths } from '../../../shared/constants/paths'
import { useAuth } from '../../../app/providers/useAuth'

export function ForbiddenPage() {
  const { session } = useAuth()
  const home = session ? homeFor(session.role) : paths.login

  return (
    <PageShell title="You cannot open this" eyebrow="Signed in">
      <p className="muted">
        This address is locked to another role. No company data is shown.
      </p>
      <p>
        <Link to={home}>Go back</Link>
      </p>
    </PageShell>
  )
}
