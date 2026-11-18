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
import { Alert } from '../../../shared/components'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { leaveEditPath, paths } from '../../../shared/constants/paths'
import { leaveTypeColour, leaveTypeDotClass } from '../../../shared/leaveTypeColour'
import { ApiError } from '../../../services/api'
import {
  cancelMyLeaveRequest,
  downloadSupportingFile,
  fetchMyLeaveRequest,
  type MyLeaveRequest,
} from '../leaveApi'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function LeaveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<MyLeaveRequest | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) return

    fetchMyLeaveRequest(id)
      .then((data) => {
        if (active) {
          setRequest(data)
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
    if (!id || cancelling) return
    setCancelling(true)
    setActionError(null)
    try {
      const updated = await cancelMyLeaveRequest(id)
      setRequest(updated)
      setCancelOpen(false)
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Could not withdraw this leave request.'),
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
  const colour = leaveTypeColour(request.leaveType)

  return (
    <PageShell
      title={request.leaveType}
      action={
        canChange ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate(leaveEditPath(request.id))}
            >
              Change request
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={() => setCancelOpen(true)}
            >
              Withdraw
            </Button>
          </div>
        ) : undefined
      }
    >
      {actionError && !cancelOpen ? (
        <Alert tone="error">{actionError}</Alert>
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
            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
            <AlertDialogDescription>
              The reviewer will be notified. You cannot undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep request</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(event) => {
                event.preventDefault()
                void handleCancel()
              }}
            >
              {cancelling ? 'Withdrawing…' : 'Withdraw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
