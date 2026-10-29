import { useEffect, useState } from 'react';
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
import { getHomeSummary, getMyRecentLeave } from '../homeApi'

export function HomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  
  const [summary, setSummary] = useState<{ remainingDays: number; usedDays: number; totalAllowance: number } | null>(null)
  const [recent, setRecent] = useState<LeaveRequestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')
        const [sum, rec] = await Promise.all([
          getHomeSummary(),
          getMyRecentLeave()
        ])
        setSummary(sum as any)
        setRecent(rec as any)
      } catch (e: any) {
        setError(e?.message || 'Failed to load home data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

          {loading && <p className="text-muted">Loading your leave...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !error && summary && (
            <div className="flex flex-wrap gap-stack">
              <p className="bg-surface p-section">
                <span className="text-title">{summary.remainingDays}</span>
                <br />
                <span className="text-muted">Annual days left</span>
              </p>
              <p className="bg-surface p-section">
                <span className="text-title">{summary.usedDays}</span>
                <br />
                <span className="text-muted">Used days</span>
              </p>
            </div>
          )}

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
            data={recent}
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