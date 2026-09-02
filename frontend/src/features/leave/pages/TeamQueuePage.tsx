import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { teamReviewPath } from '../../../shared/constants/paths'

export function TeamQueuePage() {
  return (
    <PageShell title="Team queue" eyebrow="Manager · company admin">
      <p className="muted">Leave requests still waiting for a decision.</p>
      <p>
        <Link to={teamReviewPath('demo')}>Review a sample request</Link>
      </p>
    </PageShell>
  )
}
