import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button, Modal, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function TeamReviewPage() {
  const { id } = useParams()
  const [rejectOpen, setRejectOpen] = useState(false)

  return (
    <PageShell title="Review leave" eyebrow="A decision">
      <p className="muted">
        Request <code>{id}</code>. Same request view as my leave, with approve and
        reject. Reject reason is a modal later, not a new address. A manager’s
        own leave is reviewed by company admin.
      </p>
      <p className="actions">
        <Button variant="primary" type="button" disabled>
          Approve
        </Button>
        <Button
          variant="danger"
          type="button"
          onClick={() => setRejectOpen(true)}
        >
          Reject
        </Button>
        <Link to={paths.teamQueue}>Back to queue</Link>
      </p>
      <Modal
        open={rejectOpen}
        title="Reject reason"
        onClose={() => setRejectOpen(false)}
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <TextField label="Reason" name="rejectReason" />
          <div className="actions">
            <Button variant="danger" type="submit" disabled>
              Reject (wired later)
            </Button>
            <Button
              variant="secondary"
              type="button"
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
