import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button, Modal, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import {
  approveTeamRequest,
  fetchTeamQueueDetail,
  rejectTeamRequest,
  type TeamQueueItem,
} from '../leaveApi'

export function TeamReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState<TeamQueueItem | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch leave request details',
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
      navigate(paths.teamQueue)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to approve request',
      )
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
      navigate(paths.teamQueue)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to reject request',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!id) {
    return (
      <PageShell title="Review leave" eyebrow="A decision">
        <p className="text-red-500" role="alert">
          A leave request ID is required.
        </p>
        <Link to={paths.teamQueue}>Back to queue</Link>
      </PageShell>
    )
  }

  if (loadedId !== id) {
    return (
      <PageShell title="Review leave" eyebrow="A decision">
        <p className="text-muted">Loading leave request...</p>
      </PageShell>
    )
  }

  if (error || !request) {
    return (
      <PageShell title="Review leave" eyebrow="A decision">
        <p className="text-red-500" role="alert">
          Error: {error ?? 'Leave request not found'}
        </p>
        <Link to={paths.teamQueue}>Back to queue</Link>
      </PageShell>
    )
  }

  return (
    <PageShell title="Review leave" eyebrow="A decision">
      <div className="stack">
        <p>
          <strong>Person:</strong> {request.employeeName}
        </p>
        <p>
          <strong>Leave type:</strong> {request.leaveType}
        </p>
        <p>
          <strong>Dates:</strong> {request.startDate} – {request.endDate}
        </p>
        <p>
          <strong>Working days:</strong> {request.workingDays}
        </p>
        <p>
          <strong>Status:</strong> {request.status}
        </p>
      </div>
      {actionError && !rejectOpen ? (
        <p className="text-red-500" role="alert">
          {actionError}
        </p>
      ) : null}
      <p className="actions">
        <Button
          variant="primary"
          type="button"
          disabled={submitting}
          onClick={handleApprove}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          type="button"
          disabled={submitting}
          onClick={() => {
            setActionError(null)
            setRejectOpen(true)
          }}
        >
          Reject
        </Button>
        <Link to={paths.teamQueue}>Back to queue</Link>
      </p>
      <Modal
        open={rejectOpen}
        title="Reject reason"
        onClose={() => {
          if (!submitting) setRejectOpen(false)
        }}
      >
        <form className="stack" onSubmit={handleReject}>
          <TextField
            label="Reason"
            name="rejectReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
          {actionError ? (
            <p className="text-red-500" role="alert">
              {actionError}
            </p>
          ) : null}
          <div className="actions">
            <Button
              variant="danger"
              type="submit"
              disabled={!reason.trim() || submitting}
            >
              {submitting ? 'Submitting...' : 'Reject'}
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={submitting}
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
