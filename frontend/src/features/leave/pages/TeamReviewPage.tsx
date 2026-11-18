import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { Alert } from '../../../components/ui/alert'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../components/ui/breadcrumb'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '../../../components/ui/item'
import { Label } from '../../../components/ui/label'
import { Separator } from '../../../components/ui/separator'
import { Skeleton } from '../../../components/ui/skeleton'
import { Textarea } from '../../../components/ui/textarea'
import { ApiError } from '../../../services/api'
import { paths } from '../../../shared/constants/paths'
import {
  approveTeamRequest,
  downloadSupportingFile,
  fetchTeamQueueDetail,
  rejectTeamRequest,
  type TeamQueueItem,
} from '../leaveApi'

// GET /api/leave/:id returns these today (reason, decisionReason) or will once
// the S3 backend ships (balanceBefore, teamOverlaps, events). Every extra is
// optional so the page never shows a number the API did not send.
type Overlap = {
  id?: string | number
  employeeName?: string
  name?: string
  leaveType?: string
  startDate?: string
  endDate?: string
}

type HistoryEvent = {
  id?: string | number
  label?: string
  action?: string
  type?: string
  actorName?: string | null
  note?: string | null
  createdAt?: string
  at?: string
}

type ReviewRequest = TeamQueueItem & {
  reason?: string | null
  decisionReason?: string | null
  balanceBefore?: number | null
  teamOverlaps?: Overlap[] | null
  events?: HistoryEvent[] | null
}

const statusStyles: Record<
  TeamQueueItem['status'],
  { label: string; pill: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    pill: 'bg-badge-pending! text-amber-800!',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    pill: 'bg-badge-approved! text-green-800!',
    dot: 'bg-green-600',
  },
  rejected: {
    label: 'Declined',
    pill: 'bg-badge-rejected! text-red-800!',
    dot: 'bg-red-600',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-badge-waiting! text-slate-700!',
    dot: 'bg-slate-500',
  },
  waiting: {
    label: 'Waiting',
    pill: 'bg-badge-waiting! text-slate-700!',
    dot: 'bg-slate-500',
  },
  pending_hr: {
    label: 'Awaiting HR',
    pill: 'bg-badge-pending-hr! text-sky-800!',
    dot: 'bg-sky-600',
  },
}

const cardClass = 'shadow-sm [--card-spacing:--spacing(5)]'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
  return initials || '?'
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return value || '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRange(start: string, end: string) {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`
}

function formatDays(days: number) {
  return String(Number(days.toFixed(2)))
}

function pluralDays(days: number) {
  return `${formatDays(days)} ${days === 1 ? 'day' : 'days'}`
}

function noticeLabel(submittedAt?: string | null, startDate?: string) {
  const submitted = parseDate(submittedAt)
  const start = parseDate(startDate)
  if (!submitted || !start) return '—'
  const submittedDay = new Date(
    submitted.getFullYear(),
    submitted.getMonth(),
    submitted.getDate(),
  )
  const days = Math.round((start.getTime() - submittedDay.getTime()) / 86_400_000)
  if (days < 0) return 'Submitted after the start date'
  if (days === 0) return 'Same day'
  return `${days} ${days === 1 ? 'day' : 'days'} ahead`
}

function humanise(value: string) {
  const text = value.replace(/[_-]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function StatusPill({ status }: { status: TeamQueueItem['status'] }) {
  const style = statusStyles[status] ?? statusStyles.waiting
  return (
    <Badge variant="outline" className={`gap-1.5 border-transparent! ${style.pill}`}>
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${style.dot}`}
      />
      {style.label}
    </Badge>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only" role="status">
        Loading leave request
      </span>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}

export function TeamReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<ReviewRequest | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) return

    fetchTeamQueueDetail(id)
      .then((data) => {
        if (active) {
          setRequest(data as ReviewRequest)
          setError(null)
          setLoadedId(id)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(getErrorMessage(err, 'Could not load this leave request.'))
          setLoadedId(id)
        }
      })

    return () => {
      active = false
    }
  }, [id])

  // If a decision call errors, check whether it was in fact recorded (for
  // example when only a follow-up step failed) so a recorded decision is never
  // reported as a failed one.
  async function wasRecorded(expected: TeamQueueItem['status']) {
    if (!id) return false
    try {
      const latest = await fetchTeamQueueDetail(id)
      return latest.status === expected
    } catch {
      return false
    }
  }

  const handleApprove = async () => {
    if (!id || submitting) return

    setSubmitting(true)
    setActionError(null)
    try {
      await approveTeamRequest(id)
      navigate(paths.teamQueue)
    } catch (err) {
      if (await wasRecorded('approved')) {
        navigate(paths.teamQueue)
        return
      }
      setActionError(getErrorMessage(err, 'Could not approve this request.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    const trimmedReason = reason.trim()
    if (!id || !trimmedReason || submitting) return

    setSubmitting(true)
    setActionError(null)
    try {
      await rejectTeamRequest(id, trimmedReason)
      navigate(paths.teamQueue)
    } catch (err) {
      if (await wasRecorded('rejected')) {
        navigate(paths.teamQueue)
        return
      }
      setActionError(getErrorMessage(err, 'Could not decline this request.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = () => {
    if (!id || !request?.supportingFileName) return
    setDownloading(true)
    setActionError(null)
    void downloadSupportingFile(id, request.supportingFileName)
      .catch((err: unknown) => {
        setActionError(
          getErrorMessage(err, 'Could not download the supporting file.'),
        )
      })
      .finally(() => setDownloading(false))
  }

  const dialogOpen = approveOpen || declineOpen

  if (!id) {
    return (
      <PageShell title="Review request">
        <Alert variant="destructive">A leave request ID is required.</Alert>
        <div>
          <Button asChild variant="outline">
            <Link to={paths.teamQueue}>Back to approvals</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  if (loadedId !== id) {
    return (
      <PageShell title="Review request">
        <ReviewSkeleton />
      </PageShell>
    )
  }

  if (error || !request) {
    return (
      <PageShell title="Review request">
        <Alert variant="destructive">{error ?? 'Leave request not found'}</Alert>
        <div>
          <Button asChild variant="outline">
            <Link to={paths.teamQueue}>Back to approvals</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const canDecide = request.status === 'pending'
  const firstName = request.employeeName.trim().split(/\s+/)[0] || 'them'
  const overlaps = request.teamOverlaps
  const balanceAfter = request.balanceAfter ?? null
  const balanceBefore = request.balanceBefore ?? null
  const historyEvents = request.events ?? null

  return (
    <PageShell title="Review request">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={paths.teamQueue}>Approvals</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{request.employeeName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid min-w-0 gap-4">
          <Card className={cardClass}>
            <CardContent className="grid gap-5">
              <div className="flex items-center gap-3">
                <Avatar size="lg" className="data-[size=lg]:size-12">
                  <AvatarFallback className="bg-accent! font-medium text-accent-foreground">
                    {getInitials(request.employeeName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {request.employeeName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {request.leaveType}
                  </p>
                </div>
                <StatusPill status={request.status} />
              </div>
              <Separator />
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="col-span-2">
                  <Fact
                    label="Dates"
                    value={formatRange(request.startDate, request.endDate)}
                  />
                </div>
                <Fact
                  label="Working days"
                  value={formatDays(request.workingDays)}
                />
                <Fact
                  label="Notice"
                  value={noticeLabel(request.submittedAt, request.startDate)}
                />
              </dl>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle>Reason</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {request.reason?.trim() ? (
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {request.reason}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reason was given.
                </p>
              )}
              <Separator />
              {request.supportingFileName ? (
                <ul>
                  <Item variant="outline" className="flex-nowrap">
                    <ItemMedia>
                      <FileText
                        className="size-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="truncate">
                        {request.supportingFileName}
                      </ItemTitle>
                      <ItemDescription>Supporting document</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloading}
                        onClick={handleDownload}
                      >
                        {downloading ? 'Downloading…' : 'Download'}
                      </Button>
                    </ItemActions>
                  </Item>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {request.documentRequired
                    ? 'A supporting document is required, but none was attached.'
                    : 'No supporting document attached.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
              <CardDescription>{request.leaveType} days available</CardDescription>
            </CardHeader>
            <CardContent>
              {balanceBefore !== null && balanceAfter !== null ? (
                <p className="text-2xl font-semibold text-foreground">
                  {formatDays(balanceBefore)}
                  <span aria-hidden="true" className="px-2 text-muted-foreground">
                    →
                  </span>
                  <span className="sr-only"> to </span>
                  {formatDays(balanceAfter)}
                  <span className="pl-2 text-sm font-normal text-muted-foreground">
                    days
                  </span>
                </p>
              ) : balanceAfter !== null ? (
                <p className="text-sm text-foreground">
                  After approval: {pluralDays(balanceAfter)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Balance before and after isn’t available yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle>Also off</CardTitle>
              <CardDescription>
                Teammates away during these dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overlaps == null ? (
                <p className="text-sm text-muted-foreground">
                  Team overlap isn’t available yet.
                </p>
              ) : overlaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nobody else is off in this period.
                </p>
              ) : (
                <ItemGroup>
                  {overlaps.map((overlap, index) => {
                    const name = overlap.employeeName ?? overlap.name ?? 'Teammate'
                    return (
                      <Item
                        key={overlap.id ?? `${name}-${index}`}
                        variant="muted"
                      >
                        <ItemMedia>
                          <Avatar size="sm">
                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                          </Avatar>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{name}</ItemTitle>
                          <ItemDescription>
                            {overlap.startDate && overlap.endDate
                              ? formatRange(overlap.startDate, overlap.endDate)
                              : (overlap.leaveType ?? '')}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    )
                  })}
                </ItemGroup>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemGroup>
                {historyEvents ? (
                  historyEvents.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Nothing has happened on this request yet.
                    </li>
                  ) : (
                    historyEvents.map((event, index) => {
                      const label = humanise(
                        event.label ?? event.action ?? event.type ?? 'Update',
                      )
                      const when = event.createdAt ?? event.at
                      return (
                        <Item
                          key={event.id ?? `${label}-${index}`}
                          variant="muted"
                        >
                          <ItemContent>
                            <ItemTitle>{label}</ItemTitle>
                            <ItemDescription>
                              {[event.actorName, when ? formatDate(when) : null]
                                .filter(Boolean)
                                .join(' · ')}
                              {event.note ? ` — ${event.note}` : ''}
                            </ItemDescription>
                          </ItemContent>
                        </Item>
                      )
                    })
                  )
                ) : (
                  <>
                    <Item variant="muted">
                      <ItemContent>
                        <ItemTitle>Request submitted</ItemTitle>
                        <ItemDescription>
                          {formatDate(request.submittedAt)}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    {request.status === 'approved' ||
                    request.status === 'rejected' ? (
                      <Item variant="muted">
                        <ItemContent>
                          <ItemTitle>
                            {statusStyles[request.status].label}
                          </ItemTitle>
                          {request.decisionReason ? (
                            <ItemDescription>
                              {request.decisionReason}
                            </ItemDescription>
                          ) : null}
                        </ItemContent>
                      </Item>
                    ) : null}
                  </>
                )}
              </ItemGroup>
            </CardContent>
          </Card>
        </div>

        <Card className={`${cardClass} lg:sticky lg:top-4`}>
          <CardHeader>
            <CardTitle>Your decision</CardTitle>
            <CardDescription>
              {canDecide
                ? 'Approve this request, or decline it with a reason.'
                : `This request has already been ${statusStyles[request.status].label.toLowerCase()}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {actionError && !dialogOpen ? (
              <Alert variant="destructive">{actionError}</Alert>
            ) : null}
            {canDecide ? (
              <>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setActionError(null)
                    setApproveOpen(true)
                  }}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => {
                    setActionError(null)
                    setDeclineOpen(true)
                  }}
                >
                  Decline
                </Button>
              </>
            ) : null}
            <Button asChild variant="outline">
              <Link to={paths.teamQueue}>Back to approvals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (!submitting) setApproveOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Approve {pluralDays(request.workingDays)} for {firstName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {request.leaveType}, {formatRange(request.startDate, request.endDate)}.
              {` ${firstName} will be told about your decision.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError ? <Alert variant="destructive">{actionError}</Alert> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault()
                void handleApprove()
              }}
            >
              {submitting ? 'Approving…' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={declineOpen}
        onOpenChange={(open) => {
          if (submitting) return
          setDeclineOpen(open)
          if (!open) setReason('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline {firstName}’s request?</AlertDialogTitle>
            <AlertDialogDescription>
              Give a reason. It is sent to {firstName} with your decision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="declineReason">Reason</Label>
            <Textarea
              id="declineReason"
              name="declineReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={submitting}
              required
            />
          </div>
          {actionError ? <Alert variant="destructive">{actionError}</Alert> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!reason.trim() || submitting}
              onClick={(event) => {
                event.preventDefault()
                void handleDecline()
              }}
            >
              {submitting ? 'Declining…' : 'Decline request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
