import { useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  DataTable,
  LeaveRequestRow,
  type LeaveRequestSummary,
} from '../../../shared/components'
import { teamReviewPath } from '../../../shared/constants/paths'

const sampleQueue: LeaveRequestSummary[] = [
  {
    id: 'demo',
    requesterName: 'Thandi Nkosi',
    leaveType: 'Sick',
    startDate: '2026-09-07',
    endDate: '2026-09-07',
    status: 'pending',
  },
  {
    id: 'tq-annual',
    requesterName: 'Sipho Dlamini',
    leaveType: 'Annual',
    startDate: '2026-09-21',
    endDate: '2026-09-25',
    status: 'pending',
  },
]

export function TeamQueuePage() {
  const navigate = useNavigate()

  return (
    <PageShell title="Team queue" eyebrow="Manager · company admin">
      <p className="text-muted">
        Leave requests still waiting for a decision.
      </p>
      <div className="flex flex-wrap gap-stack">
        <p className="bg-surface p-section">
          <span className="text-title">{sampleQueue.length}</span>
          <br />
          <span className="text-muted">Waiting for a decision</span>
        </p>
      </div>
      <DataTable
        data={sampleQueue}
        keyExtractor={(row) => row.id}
        emptyTitle="No requests in the queue"
        emptyDescription="Team leave waiting for a decision will show here."
        headerRow={
          <tr>
            <th>Person</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        }
        renderRow={(request) => (
          <LeaveRequestRow
            request={request}
            onView={(id) => navigate(teamReviewPath(id))}
          />
        )}
      />
    </PageShell>
  )
}
