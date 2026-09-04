import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import {
  Button,
  CalendarGrid,
  type CalendarMark,
  type CalendarView,
} from '../../../shared/components'
import { roleLabel } from '../../../shared/types/session'

const sampleMarks: CalendarMark[] = [
  { date: '2026-09-01', kind: 'leave', label: 'Leave' },
  { date: '2026-09-02', kind: 'leave', label: 'Leave' },
  { date: '2026-09-03', kind: 'leave', label: 'Leave' },
  { date: '2026-09-04', kind: 'leave', label: 'Leave' },
  { date: '2026-09-07', kind: 'leave', label: 'Leave' },
  { date: '2026-09-15', kind: 'blocked', label: 'Stocktake' },
  { date: '2026-09-24', kind: 'holiday', label: 'Heritage Day' },
]

export function CalendarPage() {
  const { session } = useAuth()
  const view: CalendarView =
    session?.role === 'company_admin'
      ? 'org'
      : session?.role === 'manager'
        ? 'team'
        : 'own'
  const viewLabel =
    view === 'org' ? 'Organisation' : view === 'team' ? 'Team' : 'Own'

  return (
    <PageShell title="Calendar" eyebrow={`${viewLabel} view`}>
      <p className="muted">
        One calendar page. {session ? roleLabel[session.role] : 'This role'} sees{' '}
        {viewLabel.toLowerCase()} marks. Holidays and blocked dates stay two records.
        Company-wide blackouts are managed at blocked dates.
      </p>
      <CalendarGrid
        year={2026}
        month={9}
        view={view}
        marks={sampleMarks}
        action={
          view === 'own' ? undefined : (
            <Button variant="secondary" disabled>
              Block dates (wired later)
            </Button>
          )
        }
      />
    </PageShell>
  )
}
