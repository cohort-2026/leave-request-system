import { Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import {
  Button,
  DataTable,
  EmptyState,
  LeaveRequestRow,
  type LeaveRequestSummary,
} from '../../../shared/components'
import { leaveDetailPath, paths } from '../../../shared/constants/paths'
import { roleLabel } from '../../../shared/types/session'

const sampleRecent: LeaveRequestSummary[] = [
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
]

export function HomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  if (!session) {
    return <Navigate to={paths.login} replace />
  }

  if (session.role === 'platform') {
    return <Navigate to={paths.platform} replace />
  }

  return (
    <PageShell
      title="Home"
      eyebrow={roleLabel[session.role]}
      action={
        <Button
          variant="primary"
          type="button"
          onClick={() => navigate(paths.leaveNew)}
        >
          Book leave
        </Button>
      }
    >
      {session.role === 'staff' ? (
        <>
          <p className="text-muted">
            My leave, remaining days, and a way to book leave.
          </p>
          <div className="flex flex-wrap gap-stack">
            <p className="bg-surface p-section">
              <span className="text-title">12</span>
              <br />
              <span className="text-muted">Annual days left</span>
            </p>
            <p className="bg-surface p-section">
              <span className="text-title">1</span>
              <br />
              <span className="text-muted">Pending request</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-stack">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.leave)}
            >
              My leave
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.calendar)}
            >
              Calendar
            </Button>
          </div>
          <DataTable
            data={sampleRecent}
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
        </>
      ) : null}
      {session.role === 'manager' ? (
        <>
          <p className="text-muted">
            How many team requests are waiting, plus a way to book your own
            leave.
          </p>
          <div className="flex flex-wrap gap-stack">
            <p className="bg-surface p-section">
              <span className="text-title">2</span>
              <br />
              <span className="text-muted">Team requests waiting</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-stack">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.teamQueue)}
            >
              Team queue
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.leave)}
            >
              My leave
            </Button>
          </div>
        </>
      ) : null}
      {session.role === 'company_admin' ? (
        <>
          <p className="text-muted">
            Claims still waiting, company requests, and shortcuts to setup.
          </p>
          <EmptyState
            title="No account claims waiting"
            description="New staff claims will show here."
          />
          <div className="flex flex-wrap gap-stack">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.teamQueue)}
            >
              Team queue
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.adminApprovals)}
            >
              Approvals
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.adminRules)}
            >
              Company rules
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(paths.adminImport)}
            >
              Import
            </Button>
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
