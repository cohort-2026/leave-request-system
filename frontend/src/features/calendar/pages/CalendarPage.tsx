// frontend/src/features/calendar/pages/CalendarPage.tsx
import { useState, useEffect } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import {
  Button,
  CalendarGrid,
  type CalendarMark,
  type CalendarView,
} from '../../../shared/components'
import { roleLabel } from '../../../shared/types/session'
import { fetchCalendarMarks } from '../calendarApi'

export function CalendarPage() {
  const { session } = useAuth()
  
  // 1. Keep one page for all roles and resolve the view scope
  const view: CalendarView =
    session?.role === 'company_admin'
      ? 'org'
      : session?.role === 'manager'
        ? 'team'
        : 'own'
  const viewLabel =
    view === 'org' ? 'Organisation' : view === 'team' ? 'Team' : 'Own'

  // 2. Track the active visible month and year (Default to September 2026 as originally setup)
  const [visibleDate, setVisibleDate] = useState(new Date(2026, 8, 1)) // 8 is September in JS Date
  const currentYear = visibleDate.getFullYear()
  const currentMonth = visibleDate.getMonth() + 1 // Convert JS 0-11 months to 1-12 for API

  // 3. Setup state for API data management
  const [marks, setMarks] = useState<CalendarMark[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadMarks() {
      setIsLoading(true)
      setError(null)
      try {
        // Calculate the first and last day of the visible month for the 'from' and 'to' params
        const yearStr = currentYear.toString()
        const monthStr = currentMonth.toString().padStart(2, '0')
        
        const lastDay = new Date(currentYear, currentMonth, 0).getDate()
        const lastDayStr = lastDay.toString().padStart(2, '0')

        const fromParam = `${yearStr}-${monthStr}-01`
        const toParam = `${yearStr}-${monthStr}-${lastDayStr}`

        const data = await fetchCalendarMarks({
          from: fromParam,
          to: toParam,
        })
        
        if (isMounted) {
          setMarks(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load calendar data')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMarks()

    return () => {
      isMounted = false
    }
  }, [currentYear, currentMonth])

  // Navigation handlers to shift months
  const handlePreviousMonth = () => {
    setVisibleDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setVisibleDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <PageShell title="Calendar" eyebrow={`${viewLabel} view`}>
      {/* Month Picker Controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, minWidth: '180px' }}>
          {visibleDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <Button variant="secondary" onClick={handlePreviousMonth}>Previous</Button>
        <Button variant="secondary" onClick={handleNextMonth}>Next</Button>
      </div>

      <p className="muted">
        One calendar page. {session ? roleLabel[session.role] : 'This role'} sees{' '}
        {viewLabel.toLowerCase()} marks. Holidays and blocked dates stay two records.
        Company-wide blackouts are managed at blocked dates.
      </p>

      {/* Render errors from API requests when they occur */}
      {error && (
        <div className="error-banner" role="alert" style={{ color: '#e11d48', margin: '1rem 0', fontWeight: 'bold' }}>
          ⚠️ Error calling the calendar API: {error}
        </div>
      )}

      {isLoading ? (
        <p className="muted">Loading live calendar marks...</p>
      ) : (
        <CalendarGrid
          year={currentYear}
          month={currentMonth}
          view={view}
          marks={marks} // Real mapped marks containing holidays and leave from API mapping
          action={
            view === 'own' ? undefined : (
              <Button variant="secondary" disabled>
                Block dates (wired later)
              </Button>
            )
          }
        />
      )}
    </PageShell>
  )
}
