import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { ApiError } from '../../../services/api'
import {
  Alert,
  DataTable,
  LeaveRequestRow,
  type LeaveRequestSummary,
} from '../../../shared/components'
import { leaveDetailPath, paths } from '../../../shared/constants/paths'
import { fetchMyLeaveRequests } from '../leaveApi'

export function LeaveListPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<LeaveRequestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchMyLeaveRequests()
      .then((data) => {
        if (active) {
          setRequests(
            data.map((request) => ({
              id: request.id,
              requesterName: request.employeeName,
              leaveType: request.leaveType,
              startDate: request.startDate,
              endDate: request.endDate,
              status: request.status,
            })),
          )
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load your leave requests.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <PageShell title="My leave" eyebrow="Staff · manager · company admin">
      <p className="muted">Your leave requests and their current status.</p>
      {loading ? <p className="text-muted">Loading your requests…</p> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {!loading && !error ? (
        <DataTable
          data={requests}
          keyExtractor={(row) => row.id}
          emptyTitle="No leave requests"
          emptyDescription="Book leave to see it here."
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
              onView={(id) => navigate(leaveDetailPath(id))}
            />
          )}
        />
      ) : null}
      <p className="actions">
        <Link to={paths.leaveNew}>Book leave</Link>
      </p>
    </PageShell>
  )
}
