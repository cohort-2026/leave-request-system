// frontend/src/features/calendar/calendarApi.ts
import { apiRequest } from '../../services/api'
import { type CalendarMark } from '../../shared/components'

export interface FetchMarksParams {
  from: string // "YYYY-MM-DD"
  to: string   // "YYYY-MM-DD"
}

interface BackendHoliday {
  date: string
  label: string
}

interface BackendLeaveDay {
  date: string
  label: string
}

interface BackendCalendarResponse {
  holidays?: BackendHoliday[]
  leave?: BackendLeaveDay[]
  date_blocks?: unknown[]
}

/**
 * Fetches real calendar marks for the displayed date range from the #176 calendar API contract.
 */
export async function fetchCalendarMarks({ from, to }: FetchMarksParams): Promise<CalendarMark[]> {
  const queryParams = new URLSearchParams({ from, to })

  // Use apiRequest to ensure lrs_session cookie is sent automatically (credentials: 'include')
  const response = await apiRequest<BackendCalendarResponse>(`/api/calendar?${queryParams.toString()}`, {
    method: 'GET',
  })

  const mappedMarks: CalendarMark[] = []

  // Map backend holidays -> kind: 'holiday'
  if (response.holidays && Array.isArray(response.holidays)) {
    for (const item of response.holidays) {
      mappedMarks.push({
        date: item.date,
        kind: 'holiday',
        label: item.label,
      })
    }
  }

  // Map backend leave -> kind: 'leave'
  if (response.leave && Array.isArray(response.leave)) {
    for (const item of response.leave) {
      mappedMarks.push({
        date: item.date,
        kind: 'leave',
        label: item.label,
      })
    }
  }

  // Drop kind: 'blocked' / date_blocks entirely for Core features II
  return mappedMarks
}

