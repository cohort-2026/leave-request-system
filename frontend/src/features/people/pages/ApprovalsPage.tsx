import { PageShell } from '../../../app/layouts/PageShell'

export function ApprovalsPage() {
  return (
    <PageShell title="Approvals" eyebrow="Company admin">
      <p className="muted">
        Account claims waiting to be accepted, plus manager leave that company
        admin must review. Waiting claims stay off the long people list.
      </p>
    </PageShell>
  )
}
