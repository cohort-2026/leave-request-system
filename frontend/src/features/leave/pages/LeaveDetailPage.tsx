import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { ApiError } from '../../../services/api'
import {
  Alert,
  Button,
  Modal,
  StatusBadge,
} from '../../../shared/components'
import {
  leaveEditPath,
  paths,
} from '../../../shared/constants/paths'
import {
  cancelMyLeaveRequest,
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
        getErrorMessage(err, 'Could not cancel this leave request.'),
      )
    } finally {
      setCancelling(false)
    }
  }

  if (!id) {
    return (
      <PageShell title="Leave request" eyebrow="Mine">
        <Alert tone="error">A leave request ID is required.</Alert>
        <Link to={paths.leave}>Back to my leave</Link>
      </PageShell>
    )
  }

  if (loadedId !== id) {
    return (
      <PageShell title="Leave request" eyebrow="Mine">
        <p className="text-muted">Loading leave request…</p>
      </PageShell>
    )
  }

  if (error || !request) {
    return (
      <PageShell title="Leave request" eyebrow="Mine">
        <Alert tone="error">{error ?? 'Leave request not found.'}</Alert>
        <Link to={paths.leave}>Back to my leave</Link>
      </PageShell>
    )
  }

  const canChange = request.status === 'pending'

  return (
    <PageShell title="Leave request" eyebrow="Mine">
      {actionError && !cancelOpen ? (
        <Alert tone="error">{actionError}</Alert>
      ) : null}
      <dl className="stack">
        <div>
          <dt className="text-muted">Status</dt>
          <dd>
            <StatusBadge status={request.status} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Leave type</dt>
          <dd>{request.leaveType}</dd>
        </div>
        <div>
          <dt className="text-muted">Dates</dt>
          <dd>
            {request.startDate} – {request.endDate}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Working days</dt>
          <dd>{request.workingDays}</dd>
        </div>
        <div>
          <dt className="text-muted">Reason</dt>
          <dd>{request.reason || 'No reason provided.'}</dd>
        </div>
        <div>
          <dt className="text-muted">Supporting file</dt>
          <dd>{request.supportingFileName ?? 'None'}</dd>
        </div>
        <div>
          <dt className="text-muted">Submitted</dt>
          <dd>{new Date(request.submittedAt).toLocaleString()}</dd>
        </div>
        {request.decisionReason ? (
          <div>
            <dt className="text-muted">Decision reason</dt>
            <dd>{request.decisionReason}</dd>
          </div>
        ) : null}
      </dl>
      <div className="actions">
        {canChange ? (
          <>
            <Button
              variant="primary"
              type="button"
              onClick={() => navigate(leaveEditPath(request.id))}
            >
              Change request
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={() => setCancelOpen(true)}
            >
              Cancel request
            </Button>
          </>
        ) : null}
        <Link to={paths.leave}>Back to my leave</Link>
      </div>
      <Modal
        open={cancelOpen}
        title="Cancel leave request?"
        onClose={() => {
          if (!cancelling) setCancelOpen(false)
        }}
      >
        <div className="stack">
          <p>
            The assigned reviewer will be notified. You cannot undo this
            cancellation.
          </p>
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <div className="actions">
            <Button
              variant="danger"
              type="button"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={cancelling}
              onClick={() => setCancelOpen(false)}
            >
              Keep request
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}
