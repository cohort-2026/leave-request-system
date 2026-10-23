import { Link } from 'react-router-dom'
import { PageShell } from './layouts/PageShell'
import { paths } from '../shared/constants/paths'

export function NotFoundPage() {
  return (
    <div className="public-shell">
      <div className="public-card">
        <PageShell title="Not found">
          <p className="muted">
            This address does not exist, or the record is not in your company.
          </p>
          <p>
            <Link to={paths.login}>Sign in</Link>
          </p>
        </PageShell>
      </div>
    </div>
  )
  // lethabo
}
