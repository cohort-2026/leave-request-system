import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { roleLabel } from '../../../shared/types/session'

export function CalendarPage() {
  const { session } = useAuth()
  const view =
    session?.role === 'company_admin'
      ? 'Organisation'
      : session?.role === 'manager'
        ? 'Team'
        : 'Own'

  return (
    <PageShell title="Calendar" eyebrow={`${view} view`}>
      <p className="muted">
        One calendar page. {session ? roleLabel[session.role] : 'This role'} sees{' '}
        {view.toLowerCase()} marks. Holidays and blocked dates stay two records.
        Company-wide blackouts are managed at blocked dates.
      </p>
      <div className="calendar-placeholder" aria-hidden="true">
        Calendar grid lands with shared components.
      </div>
    </PageShell>
  )
}
