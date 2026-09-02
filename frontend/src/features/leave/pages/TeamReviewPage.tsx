import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function TeamReviewPage() {
  const { id } = useParams()

  return (
    <PageShell title="Review leave" eyebrow="A decision">
      <p className="muted">
        Request <code>{id}</code>. Same request view as my leave, with approve and
        reject. Reject reason is a modal later, not a new address. A manager’s
        own leave is reviewed by company admin.
      </p>
      <p className="actions">
        <button type="button" disabled>
          Approve
        </button>
        <button type="button" disabled>
          Reject
        </button>
        <Link to={paths.teamQueue}>Back to queue</Link>
      </p>
    </PageShell>
  )
}
