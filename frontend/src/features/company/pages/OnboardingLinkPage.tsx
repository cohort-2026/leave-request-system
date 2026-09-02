import { PageShell } from '../../../app/layouts/PageShell'

export function OnboardingLinkPage() {
  return (
    <PageShell title="Invite link" eyebrow="Company admin">
      <p className="muted">
        The secret invite token. Copy, switch off, or replace. Staff open
        /onboard/… with that token.
      </p>
    </PageShell>
  )
}
