/**
 * Usage: <CalendarGrid year={2026} month={9} view="own" marks={marks} />
 */
import type { ReactNode } from 'react'

export type CalendarView = 'own' | 'team' | 'org'

export type CalendarMarkKind = 'leave' | 'holiday' | 'blocked'

export type CalendarMark = {
  date: string
  kind: CalendarMarkKind
  label?: string
}

type CalendarGridProps = {
  year: number
  month: number
  view?: CalendarView
  marks?: CalendarMark[]
  onDayClick?: (date: string) => void
  action?: ReactNode
  className?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function buildWeeks(year: number, month: number) {
  const days = new Date(year, month, 0).getDate()
  const leading = new Date(year, month - 1, 1).getDay()
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weeks: Array<Array<number | null>> = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return weeks
}

export function CalendarGrid({
  year,
  month,
  view = 'own',
  marks = [],
  onDayClick,
  action,
  className = '',
}: CalendarGridProps) {
  const markByDate = new Map(marks.map((mark) => [mark.date, mark]))
  const weeks = buildWeeks(year, month)
  const classes = ['calendar-grid-wrap', className].filter(Boolean).join(' ')

  return (
    <div className={classes} data-view={view}>
      <table className="calendar-grid">
        <caption>
          {MONTHS[month - 1]} {year}
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return <td key={`empty-${dayIndex}`} aria-hidden="true" />
                }

                const date = isoDate(year, month, day)
                const mark = markByDate.get(date)
                const weekend = dayIndex === 0 || dayIndex === 6
                const label = mark?.label ?? (weekend ? 'Weekend' : undefined)

                return (
                  <td
                    key={date}
                    data-kind={mark?.kind}
                    data-weekend={weekend ? 'true' : 'false'}
                    data-date={date}
                  >
                    {onDayClick ? (
                      <button type="button" onClick={() => onDayClick(date)}>
                        {day}
                      </button>
                    ) : (
                      <span>{day}</span>
                    )}
                    {label ? <small>{label}</small> : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {action ? <div className="calendar-grid-action">{action}</div> : null}
    </div>
  )
}
