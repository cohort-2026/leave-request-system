import { apiRequest } from '../../services/api'
import type { CalendarMark } from '../../shared/components'

export type CalendarScope = 'team' | 'company'
export type CalendarLeaveStatus = 'pending' | 'approved'
export type CalendarHalf = 'full' | 'am' | 'pm' | 'morning' | 'afternoon'

export type FetchCalendarParams = {
  month: string
  from: string
  to: string
  scope?: CalendarScope
  departmentId?: number | null
  viewerId?: number | null
  viewerRole?: string | null
}

type HolidayPayload = {
  date?: string
  label?: string
  name?: string
}

type DayLeavePayload = {
  id?: number | string | null
  date?: string
  label?: string
  personId?: number | null
  name?: string
  status?: string | null
  type?: string | null
}

type RangeLeavePayload = {
  id?: number | string | null
  personId?: number | null
  name?: string
  start?: string
  end?: string
  startHalf?: CalendarHalf | null
  endHalf?: CalendarHalf | null
  status?: string | null
  type?: string | null
}

type BlockPayload = {
  date?: string
  start?: string
  end?: string
  label?: string
  name?: string
}

type CalendarResponse = {
  holidays?: HolidayPayload[]
  leave?: Array<DayLeavePayload & RangeLeavePayload>
  blocks?: BlockPayload[]
  date_blocks?: unknown[]
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function monthBounds(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate()
  return {
    month: `${year}-${pad(month)}`,
    from: isoDate(year, month, 1),
    to: isoDate(year, month, lastDay),
  }
}

export function eachIsoDate(from: string, to: string): string[] {
  if (!from || !to || from > to) return []
  const dates: string[] = []
  const [year, month, day] = from.split('-').map(Number)
  const cursor = new Date(year, month - 1, day)
  while (isoDate(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()) <= to) {
    dates.push(isoDate(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function asIsoDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null
}

function asLabel(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function asId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function asPersonId(value: unknown): number | undefined {
  return asId(value)
}

function mappedLeaveType(value: unknown): string | null | undefined {
  if (value === null) return null
  return asLabel(value)
}

function normalizeHalf(value: CalendarHalf | null | undefined): 'am' | 'pm' | undefined {
  if (value === 'am' || value === 'morning') return 'am'
  if (value === 'pm' || value === 'afternoon') return 'pm'
  return undefined
}

function normalizeStatus(value: unknown): CalendarLeaveStatus | undefined {
  return value === 'pending' || value === 'approved' ? value : undefined
}

function halfOnDate(
  date: string,
  start: string,
  end: string,
  startHalf?: CalendarHalf | null,
  endHalf?: CalendarHalf | null,
): 'am' | 'pm' | undefined {
  if (date === start) return normalizeHalf(startHalf)
  if (date === end) return normalizeHalf(endHalf)
  return undefined
}

function pushMark(
  marks: CalendarMark[],
  mark: CalendarMark,
) {
  marks.push(mark)
}

function mapHoliday(item: HolidayPayload): CalendarMark | null {
  const date = asIsoDate(item.date)
  const label = asLabel(item.label) ?? asLabel(item.name)
  if (!date || !label) return null
  return { date, kind: 'holiday', label }
}

function mapBlockRange(item: BlockPayload): CalendarMark[] {
  const label = asLabel(item.label) ?? asLabel(item.name) ?? 'Blocked'
  const single = asIsoDate(item.date)
  if (single) {
    return [{ date: single, kind: 'blocked', label }]
  }
  const start = asIsoDate(item.start)
  const end = asIsoDate(item.end)
  if (!start || !end) return []
  return eachIsoDate(start, end).map((date) => ({
    date,
    kind: 'blocked' as const,
    label,
  }))
}

function mapRangeLeave(
  item: RangeLeavePayload,
  options: { viewerId?: number | null; viewerRole?: string | null } = {},
): CalendarMark[] {
  const start = asIsoDate(item.start)
  const end = asIsoDate(item.end)
  if (!start || !end) return []
  const name = asLabel(item.name)
  const type = mappedLeaveType(item.type)
  const status = normalizeStatus(item.status)
  const personId = asPersonId(item.personId)
  const leaveRequestId = asId(item.id)
  const isSelf = personId !== undefined && options.viewerId === personId
  const displayType = type === null && !isSelf ? null : type
  const label =
    displayType === null
      ? 'Away'
      : name ?? displayType ?? 'Leave'

  return eachIsoDate(start, end).map((date) => ({
    date,
    kind: 'leave' as const,
    label,
    leaveRequestId,
    personId,
    personName: options.viewerRole === 'staff' ? undefined : name,
    leaveType: displayType,
    status,
    half: halfOnDate(date, start, end, item.startHalf, item.endHalf),
  }))
}

function mapDayLeave(
  item: DayLeavePayload,
  options: { viewerId?: number | null; viewerRole?: string | null } = {},
): CalendarMark | null {
  const date = asIsoDate(item.date)
  const label = asLabel(item.label)
  if (!date || !label) return null
  const personId = asPersonId(item.personId)
  const leaveRequestId = asId(item.id)
  const name = asLabel(item.name)
  const type = mappedLeaveType(item.type)
  const status = normalizeStatus(item.status)
  const isSelf =
    (personId !== undefined && options.viewerId === personId) ||
    options.viewerRole === 'staff'
  const displayType =
    type === null && !isSelf
      ? null
      : type ?? (options.viewerRole === 'staff' ? label : undefined)
  return {
    date,
    kind: 'leave',
    label,
    leaveRequestId,
    personId,
    personName: options.viewerRole === 'staff' ? undefined : (name ?? label),
    leaveType: displayType,
    status,
  }
}

function isRangeLeave(item: DayLeavePayload & RangeLeavePayload): boolean {
  return Boolean(asIsoDate(item.start) && asIsoDate(item.end))
}

export function mapCalendarResponse(
  response: CalendarResponse,
  options: { viewerId?: number | null; viewerRole?: string | null } = {},
): CalendarMark[] {
  const marks: CalendarMark[] = []

  for (const holiday of response.holidays ?? []) {
    const mapped = mapHoliday(holiday)
    if (mapped) pushMark(marks, mapped)
  }

  for (const item of response.leave ?? []) {
    if (isRangeLeave(item)) {
      for (const mapped of mapRangeLeave(item, options)) {
        pushMark(marks, mapped)
      }
      continue
    }
    const mapped = mapDayLeave(item, options)
    if (mapped) pushMark(marks, mapped)
  }

  for (const block of response.blocks ?? []) {
    for (const mapped of mapBlockRange(block)) {
      pushMark(marks, mapped)
    }
  }

  return marks
}

export async function fetchCalendarMarks({
  month,
  from,
  to,
  scope,
  departmentId,
  viewerId,
  viewerRole,
}: FetchCalendarParams): Promise<CalendarMark[]> {
  const query = new URLSearchParams({ month, from, to })
  if (scope) query.set('scope', scope)
  if (departmentId != null) {
    query.set('departmentId', String(departmentId))
  }

  const response = await apiRequest<CalendarResponse>(
    `/api/calendar?${query.toString()}`,
    { method: 'GET' },
  )

  return mapCalendarResponse(response, { viewerId, viewerRole })
}
