import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Textarea } from '../../../components/ui/textarea'
import { Alert } from '../../../shared/components'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { leaveEditPath, paths } from '../../../shared/constants/paths'
import { leaveTypeColour, leaveTypeDotClass } from '../../../shared/leaveTypeColour'
import { ApiError, apiRequest } from '../../../services/api'
import {
  cancelMyLeaveRequest,
  downloadSupportingFile,
  fetchMyLeaveRequest,
  type MyLeaveRequest,
} from '../leaveApi'

type LeaveBalanceItem = {
  leaveType: string
  daysRemaining: number
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function LeaveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<MyLeaveRequest | null>(null)
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([])
  const [cancelReason, setCancelReason] = useState('')
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) return

   Promise.all([
      fetchMyLeaveRequest(id),
      apiRequest<{ balances?: LeaveBalanceItem[] }>('/api/leave/balances').catch(
        () => ({ balances: [] }),
      ),
    ])
      .then(([data, balanceRes]) => {
        if (active) {
          setRequest(data)
          setBalances(balanceRes.balances ?? [])
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

  async function handleDownload() {
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

  async function handleCancel() {
if (!id || !request || cancelling) return
    setCancelling(true)
    setActionError(null)
    try {
       const updated = await cancelMyLeaveRequest(
        id,
        request.status === 'approved' ? cancelReason : undefined,
      )
      setRequest(updated)
      setCancelOpen(false)
      setCancelReason('')
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          request.status === 'approved'
            ? 'Could not cancel this leave request.'
            : 'Could not withdraw this leave request.',
        ),
      )
    } finally {
      setCancelling(false)
    }
  }

  if (!id) {
    return (
      <PageShell title="Leave request">
        <Alert tone="error">A leave request ID is required.</Alert>
        <Button asChild variant="outline">
          <Link to={paths.leave}>Back to my leave</Link>
        </Button>
      </PageShell>
    )
  }

  if (loadedId !== id) {
    return (
      <PageShell title="Leave request">
        <p className="text-muted-foreground">Loading leave request…</p>
      </PageShell>
    )
  }

  if (error || !request) {
    return (
      <PageShell title="Leave request">
        <Alert tone="error">{error ?? 'Leave request not found.'}</Alert>
        <Button asChild variant="outline">
          <Link to={paths.leave}>Back to my leave</Link>
        </Button>
      </PageShell>
    )
  }

  const canChange = request.status === 'pending'
   const canWithdraw = request.canWithdraw ?? request.status === 'pending'
  const canCancelApproved = request.canCancel === true
  const isApprovedStarted =
    request.status === 'approved' && request.canCancel === false
  const colour = leaveTypeColour(request.leaveType)

  const matchingBalance = balances.find(
    (b) => b.leaveType.toLowerCase() === request.leaveType.toLowerCase(),
  )
  const currentRemaining = matchingBalance?.daysRemaining ?? null
  const nextRemaining =
    currentRemaining !== null
      ? Number((currentRemaining + request.workingDays).toFixed(2))
      : null
  const dayWord = request.workingDays === 1 ? 'day' : 'days'

  return (
    <PageShell
      title={request.leaveType}
      action={
  canChange || canWithdraw || canCancelApproved ? (
          <div className="flex flex-wrap gap-2">
            {canChange ? (
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate(leaveEditPath(request.id))}
              >
                Change request
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button
                variant="destructive"
                type="button"
                onClick={() => setCancelOpen(true)}
              >
                Withdraw
              </Button>
            ) : null}
            {canCancelApproved ? (
              <Button
                variant="destructive"
                type="button"
                onClick={() => setCancelOpen(true)}
              >
                Cancel leave
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {actionError && !cancelOpen ? (
        <Alert tone="error">{actionError}</Alert>
      ) : null}

        {isApprovedStarted ? (
        <p className="text-sm text-muted-foreground">
          Ask HR to shorten this leave
        </p>
      ) : null}


      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className={`size-3 rounded-[3px] ${leaveTypeDotClass[colour]}`}
        />
        <StatusBadge status={request.status} />
        <p className="text-sm text-muted-foreground">
          {request.startDate} – {request.endDate}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Working days</p>
              <p className="font-medium">{request.workingDays}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reason</p>
              <p className="font-medium">
                {request.reason || 'No reason provided.'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {new Date(request.submittedAt).toLocaleString()}
              </p>
            </div>
            {request.approverName || request.reviewerName ? (
              <div>
                <p className="text-muted-foreground">Approver</p>
                <p className="font-medium">
                  {request.approverName ?? request.reviewerName}
                </p>
              </div>
            ) : null}
            {request.decisionReason ? (
              <div>
                <p className="text-muted-foreground">Decision reason</p>
                <p className="font-medium">{request.decisionReason}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supporting file</CardTitle>
          </CardHeader>
          <CardContent>
            {request.supportingFileName ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm">{request.supportingFileName}</p>
                <Button
                  variant="outline"
                  type="button"
                  disabled={downloading}
                  onClick={() => void handleDownload()}
                >
                  {downloading ? 'Opening…' : 'View file'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No supporting file was attached.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Button asChild variant="ghost">
        <Link to={paths.leave}>Back to my leave</Link>
      </Button>

         <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canCancelApproved
                ? 'Cancel approved leave?'
                : 'Withdraw this request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canCancelApproved ? (
                <>
                  {request.workingDays} {dayWord} will return to your{' '}
                  {request.leaveType} balance
                  {currentRemaining !== null && nextRemaining !== null
                    ? ` (${currentRemaining} → ${nextRemaining})`
                    : ''}
                  .
                </>
              ) : (
                'The reviewer will be notified. You cannot undo this.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {canCancelApproved ? (
            <div className="grid gap-2 py-2">
              <label
                htmlFor="cancel-reason"
                className="text-sm font-medium text-foreground"
              >
                Reason (optional)
              </label>
              <Textarea
                id="cancel-reason"
                placeholder="Optional note for HR or your manager..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          ) : null}

          {actionError ? <Alert tone="error">{actionError}</Alert> : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              {canCancelApproved ? 'Keep leave' : 'Keep request'}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(event) => {
                event.preventDefault()
                void handleCancel()
              }}
            >
              {cancelling
                ? canCancelApproved
                  ? 'Cancelling…'
                  : 'Withdrawing…'
                : canCancelApproved
                  ? 'Cancel leave'
                  : 'Withdraw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
