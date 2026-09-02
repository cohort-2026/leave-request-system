import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function LeaveDetailPage() {
  const { id } = useParams()

  return (
    <PageShell title="One request" eyebrow="Mine">
      <p className="muted">
        Request <code>{id}</code>. Owner, their manager, or company admin. Owner
        may cancel while it is still waiting. Approved and rejected are states of
        this same screen.
      </p>
      <p>
        <Link to={paths.leave}>Back to my leave</Link>
      </p>
    </PageShell>
  )
}
