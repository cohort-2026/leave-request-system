import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../components/ui/breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Field, FieldLabel } from '../../../components/ui/field'
import { Textarea } from '../../../components/ui/textarea'
import { Alert as UiAlert } from '../../../components/ui/alert'
import { ApiError } from '../../../services/api'
import { paths } from '../../../shared/constants/paths'
import {
  approveTeamRequest,
  downloadSupportingFile,
  fetchTeamQueueDetail,
  rejectTeamRequest,
  type TeamQueueItem,
} from '../leaveApi'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
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

function formatDays(value: number | null | undefined) {
  return value == null ? 'Not tracked' : `${value} ${value === 1 ? 'day' : 'days'}`
}

function eventLabel(type: string) {
  switch (type) {
    case 'submitted':
      return 'Request submitted'
    case 'approved':
      return 'Request approved'
    case 'rejected':
      return 'Request declined'
    case 'cancelled':
      return 'Request cancelled'
    default:
      return type
  }
}

export function TeamReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<TeamQueueItem | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) return

    fetchTeamQueueDetail(id)
      .then((data) => {
        if (active) {
          setRequest(data)
          setError(null)
          setLoadedId(id)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            getErrorMessage(err, 'Could not load this leave request.'),
          )
          setLoadedId(id)
        }
      })

    return () => {
      active = false
    }
  }, [id])

  const handleApprove = async () => {
    if (!id || submitting) return

    setSubmitting(true)
    setActionError(null)
    try {
      await approveTeamRequest(id)
      window.dispatchEvent(new Event('team-queue-updated'))
      navigate(paths.teamQueue)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not approve this request.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedReason = reason.trim()
    if (!id || !trimmedReason || submitting) return

    setSubmitting(true)
    setActionError(null)
    try {
      await rejectTeamRequest(id, trimmedReason)
      window.dispatchEvent(new Event('team-queue-updated'))
      navigate(paths.teamQueue)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not reject this request.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async () => {
    if (!id || !request?.supportingFileName || downloading) return

    setDownloading(true)
    setActionError(null)
    try {
      await downloadSupportingFile(id, request.supportingFileName)
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Could not download the supporting file.'),
      )
    } finally {
      setDownloading(false)
    }
  }

  if (!id) {
    return (
      <PageShell title="Review leave" eyebrow="A decision">
        <UiAlert variant="destructive">A leave request ID is required.</UiAlert>
        <Link to={paths.teamQueue}>Back to queue</Link>
      </PageShell>
    )
  }

  if (loadedId !== id) {
    return (
      <PageShell title="Review leave" eyebrow="A decision">
        <p className="text-muted-foreground" role="status">
          Loading leave request…
        </p>
      </PageShell>
    )
  }

  if (error || !request) {
    return (
      <PageShell title="Review leave" eyebrow="A decision">
        <div className="space-y-4">
          <UiAlert variant="destructive">
            {error ?? 'Leave request not found'}
          </UiAlert>
          <Button asChild variant="outline">
            <Link to={paths.teamQueue}>Back to approvals</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const canDecide = request.status === 'pending'
  const statusLabel =
    request.status.charAt(0).toUpperCase() + request.status.slice(1)

  return (
    <PageShell title="Review leave request" eyebrow="Approvals">
      <div className="space-y-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={paths.teamQueue}>Approvals</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Request details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {actionError ? (
          <UiAlert variant="destructive">{actionError}</UiAlert>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {getInitials(request.employeeName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-xl">
                        {request.employeeName}
                      </CardTitle>
                      <CardDescription>
                        {request.leaveType} · {request.workingDays}{' '}
                        {request.workingDays === 1
                          ? 'working day'
                          : 'working days'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={canDecide ? 'secondary' : 'outline'}
                    className="capitalize"
                  >
                    {statusLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Start date</dt>
                    <dd className="mt-1 font-medium">{request.startDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">End date</dt>
                    <dd className="mt-1 font-medium">{request.endDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Submitted
                    </dt>
                    <dd className="mt-1 font-medium">
                      {request.submittedAt
                        ? new Date(request.submittedAt).toLocaleString()
                        : 'Date unavailable'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Supporting document
                    </dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                      {request.supportingFileName ? (
                        <>
                          <span className="break-all">
                            {request.supportingFileName}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={downloading}
                            onClick={() => void handleDownload()}
                          >
                            {downloading ? 'Downloading…' : 'Download'}
                          </Button>
                        </>
                      ) : (
                        'None attached'
                      )}
                    </dd>
                  </div>
                </dl>

                <section aria-labelledby="request-reason-heading">
                  <h2
                    id="request-reason-heading"
                    className="mb-2 text-sm font-semibold"
                  >
                    Reason for leave
                  </h2>
                  <p className="m-0 whitespace-pre-wrap text-sm text-muted-foreground">
                    {request.reason?.trim() || 'No reason provided.'}
                  </p>
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team schedule</CardTitle>
                <CardDescription>
                  Other pending or approved leave that overlaps these dates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.teamOverlaps?.length ? (
                  <ul className="m-0 divide-y p-0">
                    {request.teamOverlaps.map((overlap) => (
                      <li
                        key={overlap.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="m-0 font-medium">
                            {overlap.employeeName}
                          </p>
                          <p className="m-0 text-sm text-muted-foreground">
                            {overlap.leaveType} · {overlap.startDate} –{' '}
                            {overlap.endDate}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {overlap.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-sm text-muted-foreground">
                    No overlapping team requests.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request history</CardTitle>
                <CardDescription>
                  Activity recorded for this request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.events?.length ? (
                  <ol className="m-0 space-y-4 border-l pl-5">
                    {request.events.map((event, index) => (
                      <li
                        key={`${event.type}-${event.at}-${index}`}
                        className="relative"
                      >
                        <span className="absolute -left-[1.55rem] top-1.5 size-2 rounded-full bg-primary" />
                        <p className="m-0 font-medium">{eventLabel(event.type)}</p>
                        <p className="m-0 text-sm text-muted-foreground">
                          {event.actorName} ·{' '}
                          {new Date(event.at).toLocaleString()}
                        </p>
                        {event.reason ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {event.reason}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="m-0 text-sm text-muted-foreground">
                    No activity recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Leave balance</CardTitle>
                <CardDescription>
                  Balance is shown before and after this request.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="m-0 text-sm text-muted-foreground">Available</p>
                  <p className="mb-0 mt-1 font-semibold">
                    {formatDays(request.balance?.available)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="m-0 text-sm text-muted-foreground">
                    After approval
                  </p>
                  <p className="mb-0 mt-1 font-semibold">
                    {formatDays(
                      request.balance?.afterApproval ?? request.balanceAfter,
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your decision</CardTitle>
                <CardDescription>
                  {canDecide
                    ? 'Choose what happens next for this request.'
                    : 'This request has already been decided.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canDecide ? (
                  <>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={submitting}
                      onClick={() => {
                        setActionError(null)
                        setApproveOpen(true)
                      }}
                    >
                      Approve request
                    </Button>
                    <form className="space-y-3" onSubmit={handleReject}>
                      <Field>
                        <FieldLabel htmlFor="decline-reason">
                          Reason for declining
                        </FieldLabel>
                        <Textarea
                          id="decline-reason"
                          name="declineReason"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Explain why this request cannot be approved."
                          required
                          maxLength={2000}
                          disabled={submitting}
                        />
                      </Field>
                      <Button
                        type="submit"
                        variant="destructive"
                        className="w-full"
                        disabled={!reason.trim() || submitting}
                      >
                        {submitting ? 'Submitting…' : 'Decline request'}
                      </Button>
                    </form>
                  </>
                ) : (
                  <p className="m-0 text-sm text-muted-foreground">
                    No further decision is needed.
                  </p>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to={paths.teamQueue}>Back to approvals</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              Approving {request.workingDays} working{' '}
              {request.workingDays === 1 ? 'day' : 'days'} for{' '}
              {request.employeeName} will update their leave balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError ? (
            <UiAlert variant="destructive">{actionError}</UiAlert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
              >
                Go back
              </Button>
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void handleApprove()}
            >
              {submitting ? 'Approving…' : 'Confirm approval'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
