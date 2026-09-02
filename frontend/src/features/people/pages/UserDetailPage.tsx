import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function UserDetailPage() {
  const { id } = useParams()

  return (
    <PageShell title="One person" eyebrow="Company admin">
      <p className="muted">
        Person <code>{id}</code>. Role, department, manager. Accept or refuse a
        claim on that same person row.
      </p>
      <p>
        <Link to={paths.adminUsers}>Back to people</Link>
      </p>
    </PageShell>
  )
}
