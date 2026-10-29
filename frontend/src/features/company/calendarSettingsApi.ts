import { apiRequest } from '../../services/api'

export type WorkingDaySettings = {
  mondayIsWorking: boolean
  tuesdayIsWorking: boolean
  wednesdayIsWorking: boolean
  thursdayIsWorking: boolean
  fridayIsWorking: boolean
  saturdayIsWorking: boolean
  sundayIsWorking: boolean
}

export type PublicHoliday = {
  id: number
  date: string
  name: string
}

export type CalendarSettings = WorkingDaySettings & {
  holidays: PublicHoliday[]
}

type CreatedHolidayResponse = {
  holiday: PublicHoliday
}

export function getCalendarSettings() {
  return apiRequest<CalendarSettings>('/api/companies/current/calendar')
}

export function saveWorkingDays(settings: WorkingDaySettings) {
  return apiRequest<CalendarSettings>('/api/companies/current/calendar', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

export function createPublicHoliday(date: string, name: string) {
  return apiRequest<CreatedHolidayResponse>(
    '/api/companies/current/holidays',
    {
      method: 'POST',
      body: JSON.stringify({ date, name }),
    },
  )
}

export function deletePublicHoliday(id: number) {
  return apiRequest<{ ok: true }>(`/api/companies/current/holidays/${id}`, {
    method: 'DELETE',
  })
}
