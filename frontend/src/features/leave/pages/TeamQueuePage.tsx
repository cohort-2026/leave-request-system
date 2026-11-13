import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs'
import { ApiError } from '../../../services/api'
import {
  Alert,
  EmptyState,
  Select,
} from '../../../shared/components'
import { teamReviewPath } from '../../../shared/constants/paths'
import {
  approveTeamRequest,
  fetchTeamQueue,
  type TeamQueueItem,
} from '../leaveApi'

function getErrorMessage(
  error: unknown,
  fallback = 'Could not load approvals.',
) {
  return error instanceof ApiError
    ? error.message
    : fallback
}

function getWaitingTime(submittedAt?: string | null) {
  if (!submittedAt) return null

  const submittedTime = new Date(submittedAt).getTime()
  if (!Number.isFinite(submittedTime)) return null

  const days = Math.max(0, Math.floor((Date.now() - submittedTime) / 86_400_000))
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function oldestFirst(left: TeamQueueItem, right: TeamQueueItem) {
  const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : NaN
  const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : NaN

  if (!Number.isFinite(leftTime)) return Number.isFinite(rightTime) ? 1 : 0
  if (!Number.isFinite(rightTime)) return -1
  return leftTime - rightTime
}

export function TeamQueuePage() {
  const [queue, setQueue] = useState<TeamQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all')

  useEffect(() => {
    let active = true
    fetchTeamQueue()
      .then((data) => {
        if (active) {
          setQueue(
            data.map((item) => ({
              id: item.id,
              employeeName: item.employeeName,
              startDate: item.startDate,
              endDate: item.endDate,
              workingDays: item.workingDays,
              leaveType: item.leaveType,
              status: item.status,
              supportingFileName: item.supportingFileName,
              submittedAt: item.submittedAt,
              balanceAfter: item.balanceAfter,
              clashCount: item.clashCount,
              documentRequired: item.documentRequired,
            })),
          )
          setError(null)
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const leaveTypes = useMemo(
    () => [...new Set(queue.map((item) => item.leaveType))].sort(),
    [queue],
  )
  const visibleQueue = useMemo(
    () =>
      queue
        .filter(
          (item) =>
            leaveTypeFilter === 'all' || item.leaveType === leaveTypeFilter,
        )
        .sort(oldestFirst),
    [leaveTypeFilter, queue],
  )

  const handleQuickApprove = async (item: TeamQueueItem) => {
    if (approvingId) return

    setApprovingId(item.id)
    setActionError(null)
    try {
      await approveTeamRequest(item.id)
      setQueue((currentQueue) =>
        currentQueue.filter((request) => request.id !== item.id),
      )
      window.dispatchEvent(new Event('team-queue-updated'))
    } catch (approveError: unknown) {
      setActionError(
        getErrorMessage(approveError, 'Could not approve this request.'),
      )
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <PageShell title="Approvals" eyebrow="Team · company admin">
      <p className="max-w-2xl text-muted-foreground">
        Review leave requests in the order they came in. Requests with a clash
        or supporting document need a closer look.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      <Tabs defaultValue="needs-decision" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="needs-decision">
            Needs your decision
            {!loading && !error ? (
              <Badge variant="secondary" className="ml-2">
                {queue.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="awaiting-hr" disabled>
            Awaiting HR
          </TabsTrigger>
        </TabsList>
        <TabsContent value="needs-decision" className="mt-4 space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">
                  {loading
                    ? 'Loading approvals…'
                    : error
                      ? 'Approvals unavailable'
                      : `${queue.length} waiting`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Oldest requests are shown first.
                </p>
              </div>
              <Select
                label="Leave type"
                name="leaveTypeFilter"
                value={leaveTypeFilter}
                onChange={(event) => setLeaveTypeFilter(event.target.value)}
                className="w-full sm:w-56"
              >
                <option value="all">All leave types</option>
                {leaveTypes.map((leaveType) => (
                  <option key={leaveType} value={leaveType}>
                    {leaveType}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>
          {loading ? (
            <p className="text-muted-foreground" role="status">
              Loading approvals…
            </p>
          ) : null}
          {!loading && !error && visibleQueue.length === 0 ? (
            <EmptyState
              title={queue.length === 0 ? "You're all caught up" : 'No matching requests'}
              description={
                queue.length === 0
                  ? 'There are no leave requests waiting for your decision.'
                  : 'Try selecting a different leave type.'
              }
            />
          ) : null}
          {!loading && !error && visibleQueue.length > 0 ? (
            <ul className="m-0 grid list-none gap-3 p-0">
              {visibleQueue.map((item) => {
                const hasDocument = Boolean(
                  item.supportingFileName || item.documentRequired,
                )
                const canQuickApprove =
                  item.status === 'pending' &&
                  item.clashCount === 0 &&
                  !hasDocument

                return (
                  <li key={item.id}>
                    <Card className="transition-colors hover:ring-foreground/20">
                      <CardContent className="grid gap-4 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <Link
                          to={teamReviewPath(item.id)}
                          className="flex min-w-0 items-start gap-3 rounded-md text-foreground no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Avatar className="mt-0.5">
                            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                              {getInitials(item.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="font-semibold">
                                {item.employeeName}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {item.leaveType}
                              </span>
                            </div>
                            <p className="m-0 text-sm text-muted-foreground">
                              {item.startDate} – {item.endDate}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">
                                {item.workingDays}{' '}
                                {item.workingDays === 1
                                  ? 'working day'
                                  : 'working days'}
                              </Badge>
                              <Badge variant="outline">
                                {getWaitingTime(item.submittedAt) ??
                                  'Waiting time unavailable'}
                              </Badge>
                              <Badge variant="secondary">
                                Balance after:{' '}
                                {item.balanceAfter == null
                                  ? 'unavailable'
                                  : `${item.balanceAfter} days`}
                              </Badge>
                              {item.clashCount === undefined ||
                              item.clashCount === null ? (
                                <Badge variant="secondary">
                                  Clash check pending
                                </Badge>
                              ) : item.clashCount > 0 ? (
                                <Badge variant="destructive">
                                  {item.clashCount}{' '}
                                  {item.clashCount === 1 ? 'clash' : 'clashes'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No clashes</Badge>
                              )}
                              {item.documentRequired ? (
                                <Badge variant="destructive">
                                  Document required
                                </Badge>
                              ) : hasDocument ? (
                                <Badge variant="outline">
                                  Document attached
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No document</Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          {!canQuickApprove ? (
                            <Link
                              to={teamReviewPath(item.id)}
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                              Review details
                            </Link>
                          ) : null}
                          {canQuickApprove ? (
                            <Button
                              type="button"
                              disabled={approvingId !== null}
                              onClick={() => void handleQuickApprove(item)}
                            >
                              {approvingId === item.id
                                ? 'Approving…'
                                : 'Quick approve'}
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </TabsContent>
        <TabsContent value="awaiting-hr" />
      </Tabs>
    </PageShell>
  )
}