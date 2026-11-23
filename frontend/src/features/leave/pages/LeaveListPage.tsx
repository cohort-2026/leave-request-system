import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button } from '../../../components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../../components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs'
import { Alert } from '../../../shared/components'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { leaveDetailPath, paths } from '../../../shared/constants/paths'
import { leaveTypeColour, leaveTypeDotClass } from '../../../shared/leaveTypeColour'
import { ApiError } from '../../../services/api'
import {
  fetchMyLeaveRequests,
  type LeaveHalf,
  type MyLeaveRequest,
} from '../leaveApi'

type LeaveTab = 'all' | 'pending' | 'upcoming' | 'past' | 'cancelled'

function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function yearOf(request: MyLeaveRequest) {
  return Number((request.startDate ?? '').slice(0, 4))
}

function halfNote(part?: LeaveHalf | null) {
  if (!part || part === 'full') return null
  if (part === 'am' || part === 'morning') return 'morning'
  if (part === 'pm' || part === 'afternoon') return 'afternoon'
  return null
}

function formatDates(request: MyLeaveRequest) {
  const startNote = halfNote(request.startHalf)
  const endNote = halfNote(request.endHalf)
  const sameDay = request.startDate === request.endDate
  if (sameDay) {
    return startNote ? `${request.startDate} · ${startNote}` : request.startDate
  }
  const start = startNote ? `${request.startDate} (${startNote})` : request.startDate
  const end = endNote ? `${request.endDate} (${endNote})` : request.endDate
  return `${start} – ${end}`
}

function formatSubmitted(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function matchesTab(request: MyLeaveRequest, tab: LeaveTab, today: string) {
  if (tab === 'all') return true
  if (tab === 'pending') return request.status === 'pending'
  if (tab === 'cancelled') return request.status === 'cancelled'
  if (tab === 'upcoming') {
    return request.status === 'approved' && request.endDate >= today
  }
  return (
    (request.status === 'approved' || request.status === 'rejected') &&
    request.endDate < today
  )
}

function approverLabel(request: MyLeaveRequest) {
  return request.approverName ?? request.reviewerName ?? '—'
}

export function LeaveListPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<MyLeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<LeaveTab>('all')
  const [year, setYear] = useState('all')
  const today = todayIso()

  useEffect(() => {
    let active = true
    fetchMyLeaveRequests()
      .then((data) => {
        if (active) setRequests(data)
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

  const years = useMemo(() => {
    const values = new Set<number>()
    for (const request of requests) {
      const value = yearOf(request)
      if (Number.isInteger(value) && value > 0) values.add(value)
    }
    values.add(new Date().getFullYear())
    return [...values].sort((a, b) => b - a)
  }, [requests])

  const filtered = requests.filter((request) => {
    if (year !== 'all' && String(yearOf(request)) !== year) return false
    return matchesTab(request, tab, today)
  })

  const requestLeave = (
    <Button asChild>
      <Link to={paths.leaveNew}>Request leave</Link>
    </Button>
  )

  return (
    <PageShell title="My leave" action={requestLeave}>
      {loading ? (
        <p className="text-muted-foreground">Loading your requests…</p>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {!loading && !error ? (
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as LeaveTab)}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
            <label className="grid gap-1 text-sm font-medium sm:w-40">
              Year
              <select
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              >
                <option value="all">All years</option>
                {years.map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <Empty className="rounded-xl border border-dashed bg-card p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarPlus />
                </EmptyMedia>
                <EmptyTitle>No leave requests yet</EmptyTitle>
                <EmptyDescription>
                  Request leave to see it listed here with dates, working days,
                  and status.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>{requestLeave}</EmptyContent>
            </Empty>
          ) : (
            <>
              <div className="hidden md:block overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer"
                        onClick={() => navigate(leaveDetailPath(request.id))}
                      >
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={`size-2.5 shrink-0 rounded-[3px] ${leaveTypeDotClass[leaveTypeColour(request.leaveType)]}`}
                            />
                            {request.leaveType}
                          </span>
                        </TableCell>
                        <TableCell>{formatDates(request)}</TableCell>
                        <TableCell>{request.workingDays}</TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell>{approverLabel(request)}</TableCell>
                        <TableCell>{formatSubmitted(request.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="grid gap-3 md:hidden">
                {filtered.map((request) => (
                  <li key={request.id}>
                    <button
                      type="button"
                      className="grid w-full gap-2 rounded-xl border bg-card p-4 text-left shadow-sm"
                      onClick={() => navigate(leaveDetailPath(request.id))}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                          <span
                            aria-hidden="true"
                            className={`size-2.5 shrink-0 rounded-[3px] ${leaveTypeDotClass[leaveTypeColour(request.leaveType)]}`}
                          />
                          <span className="truncate">{request.leaveType}</span>
                        </span>
                        <StatusBadge status={request.status} />
                      </span>
                      <span className="text-sm text-foreground">
                        {formatDates(request)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {request.workingDays}{' '}
                        {request.workingDays === 1 ? 'day' : 'days'} ·{' '}
                        {approverLabel(request)} ·{' '}
                        {formatSubmitted(request.submittedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </PageShell>
  )
}
