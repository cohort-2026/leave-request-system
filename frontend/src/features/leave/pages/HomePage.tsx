import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { ApiError } from '../../../services/api'
import {
  Alert,
  Button,
  DataTable,
  EmptyState,
  LeaveRequestRow,
} from '../../../shared/components'
import { leaveDetailPath, paths } from '../../../shared/constants/paths'
import { roleLabel } from '../../../shared/types/session'
import { getHomeSummary, type HomeSummary } from '../homeApi'
import { getLeaveBalances, type LeaveBalance } from '../balancesApi'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Could not load your home overview.'
}

export function HomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<HomeSummary | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session || session.role === 'platform') {
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        // Keep the balances endpoint as the source for the balance cards.
        const [homeData, balancesData] = await Promise.all([
          getHomeSummary(),
          getLeaveBalances(),
        ])
        
        if (cancelled) return
        setSummary(homeData)
        setBalances(balancesData)
      } catch (loadError: unknown) {
        if (!cancelled) setError(getErrorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [session])

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
      {loading ? <p className="text-muted">Loading your leave balances…</p> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {!loading && !error ? (
        <>
          <h2>Your remaining days</h2>
          <div className="flex flex-wrap gap-stack">
            {balances.length === 0 ? (
              <p className="text-muted text-sm">No balances yet</p>
            ) : (
              balances.map((balance) => (
                <p key={balance.leaveType} className="bg-surface p-section">
                  <span className="text-title">{balance.daysRemaining}</span>
                  <br />
                  <span className="text-muted">
                    {balance.leaveType} days left ({balance.usedDays} used of {balance.totalAllowance})
                  </span>
                </p>
              ))
            )}
          </div>
        </>
      ) : null}

      {!loading && !error && summary ? (
        <>
          <h2>Requests waiting</h2>
          <p className="bg-surface p-section">
            <span className="text-title">{summary.pendingCount}</span>
            <br />
            <span className="text-muted">Pending requests</span>
          </p>

          <h2>Recent requests</h2>
          <DataTable
            data={summary.recent.map((request) => ({
              ...request,
              id: String(request.id),
            }))}
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
      {session.role === 'staff' ? (
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