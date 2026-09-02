import { PageShell } from '../../../app/layouts/PageShell'

export function BlocksPage() {
  return (
    <PageShell title="Blocked dates" eyebrow="Company admin">
      <p className="muted">
        Dates that refuse a new request. Not the same record as a public holiday.
      </p>
    </PageShell>
  )
}
