// frontend/src/features/calendar/calendarApi.ts
import { type CalendarMark, type CalendarView } from '../../shared/components'

export interface FetchMarksParams {
  scope: CalendarView
  year: number
  month: number
}

/**
 * Fetches real calendar marks for the displayed month from the calendar API.
 */
export async function fetchCalendarMarks({ scope, year, month }: FetchMarksParams): Promise<CalendarMark[]> {
  const queryParams = new URLSearchParams({
    scope,
    year: year.toString(),
    month: month.toString(),
  })

  const response = await fetch(`/api/calendar/marks?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch calendar marks: ${response.statusText}`)
  }

  return response.json()
}
