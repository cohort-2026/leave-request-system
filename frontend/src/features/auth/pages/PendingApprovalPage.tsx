import { PageShell } from '../../../app/layouts/PageShell'

export function PendingApprovalPage() {
  return (
    <PageShell title="Please wait" eyebrow="Verified · not accepted">
      <p className="muted">
        You are signed in, but the company still has to accept the claim. Leave
        stays closed until then.
      </p>
    </PageShell>
  )
}
