import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function OnboardDisabledPage() {
  return (
    <PageShell title="This link is off" eyebrow="Public">
      <Alert tone="error">
        The invite was switched off or replaced. Ask a company admin for a new
        link.
      </Alert>
      <p>
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}
