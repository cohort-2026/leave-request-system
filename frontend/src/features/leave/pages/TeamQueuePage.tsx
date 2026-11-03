import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  DataTable,
  LeaveRequestRow,
  type LeaveRequestSummary,
} from '../../../shared/components'
import { teamReviewPath } from '../../../shared/constants/paths'
import { fetchTeamQueue } from '../leaveApi'

export function TeamQueuePage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<LeaveRequestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamQueue()
      .then((data) => {
        setQueue(
          data.map((item) => ({
            id: item.id,
            requesterName: item.employeeName,
            leaveType: item.leaveType,
            startDate: item.startDate,
            endDate: item.endDate,
            status: item.status,
          })),
        )
        setLoading(false)
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch team queue',
        )
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <PageShell title="Team queue" eyebrow="Manager · company admin">
        <p className="text-muted">Loading team queue...</p>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="Team queue" eyebrow="Manager · company admin">
        <p className="text-red-500">Error: {error}</p>
      </PageShell>
    )
  }

  return (
    <PageShell title="Team queue" eyebrow="Manager · company admin">
      <p className="text-muted">
        Leave requests still waiting for a decision.
      </p>
      <div className="flex flex-wrap gap-stack">
        <p className="bg-surface p-section">
          <span className="text-title">{queue.length}</span>
          <br />
          <span className="text-muted">Waiting for a decision</span>
        </p>
      </div>
      <DataTable
        data={queue}
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