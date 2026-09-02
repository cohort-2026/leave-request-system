import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function OnboardDisabledPage() {
  return (
    <PageShell title="This link is off" eyebrow="Public">
      <p className="muted">
        The invite was switched off or replaced. Ask a company admin for a new
        link.
      </p>
      <p>
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}
