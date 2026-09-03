import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  DataTable,
  LeaveRequestRow,
  type LeaveRequestSummary,
} from '../../../shared/components'
import { leaveDetailPath, paths } from '../../../shared/constants/paths'

const sampleLeave: LeaveRequestSummary[] = [
  {
    id: 'demo',
    requesterName: 'Thandi Nkosi',
    leaveType: 'Annual',
    startDate: '2026-09-01',
    endDate: '2026-09-04',
    status: 'approved',
  },
  {
    id: 'lr-sick',
    requesterName: 'Thandi Nkosi',
    leaveType: 'Sick',
    startDate: '2026-09-07',
    endDate: '2026-09-07',
    status: 'pending',
  },
  {
    id: 'lr-family',
    requesterName: 'Thandi Nkosi',
    leaveType: 'Family',
    startDate: '2026-10-12',
    endDate: '2026-10-14',
    status: 'rejected',
  },
]

export function LeaveListPage() {
  const navigate = useNavigate()

  return (
    <PageShell title="My leave" eyebrow="Staff · manager · company admin">
      <p className="muted">This person’s leave requests only.</p>
      <DataTable
        data={sampleLeave}
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
      <p className="actions">
        <Link to={paths.leaveNew}>Book leave</Link>
      </p>
    </PageShell>
  )
}
