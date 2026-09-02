import { PageShell } from '../../../app/layouts/PageShell'

export function CalendarSettingsPage() {
  return (
    <PageShell title="Week and holidays" eyebrow="Company admin">
      <p className="muted">
        Which weekdays count, and public holidays that do not count. A holiday
        is not a blocked date.
      </p>
    </PageShell>
  )
}
