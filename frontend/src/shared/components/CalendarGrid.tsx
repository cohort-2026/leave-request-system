/**
 * Usage: <CalendarGrid year={2026} month={11} view="team" marks={marks} />
 */
import type { ComponentProps, ReactNode } from 'react'
import type { DayButtonProps, DayProps, WeekProps, WeekdaysProps, WeeksProps } from 'react-day-picker'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Card, CardContent } from '../../components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '../../components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip'
import { cn } from '../../lib/utils'
import {
  leaveTypeChipClass,
  leaveTypeColour,
  leaveTypeDotClass,
  leaveTypePendingChipClass,
} from '../leaveTypeColour'

export type CalendarView = 'own' | 'team' | 'org'

export type CalendarMarkKind = 'leave' | 'holiday' | 'blocked'

export type CalendarMark = {
  date: string
  kind: CalendarMarkKind
  label?: string
  leaveRequestId?: number
  personId?: number
  personName?: string
  leaveType?: string | null
  status?: 'pending' | 'approved'
  half?: 'am' | 'pm'
}

export type CalendarLegendItem = {
  label: string
  swatchClass: string
}

export const CALENDAR_LEGEND: CalendarLegendItem[] = [
  { label: 'Annual', swatchClass: 'bg-leave-annual' },
  { label: 'Sick', swatchClass: 'bg-leave-sick' },
  { label: 'Family', swatchClass: 'bg-leave-family' },
  { label: 'Parental', swatchClass: 'bg-leave-parental' },
  { label: 'Unpaid', swatchClass: 'bg-leave-unpaid' },
  { label: 'Study', swatchClass: 'bg-leave-study' },
  { label: 'Holiday', swatchClass: 'bg-stone-400' },
  { label: 'Away', swatchClass: 'bg-muted-foreground/50' },
  { label: 'Pending', swatchClass: 'border border-dashed border-violet-400 bg-transparent' },
]

type CalendarGridProps = {
  year: number
  month: number
  view?: CalendarView
  marks?: CalendarMark[]
  onDayClick?: (date: string) => void
  onMonthChange?: (year: number, month: number) => void
  hrefForMark?: (mark: CalendarMark) => string | null
  action?: ReactNode
  className?: string
  today?: string
  selected?: string
}

const MAX_CHIPS = 4

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function toIso(date: Date) {
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function fromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function groupMarks(marks: CalendarMark[]) {
  const grouped = new Map<string, CalendarMark[]>()
  for (const mark of marks) {
    const existing = grouped.get(mark.date)
    if (existing) existing.push(mark)
    else grouped.set(mark.date, [mark])
  }
  for (const dayMarks of grouped.values()) {
    dayMarks.sort((a, b) => {
      const kindDelta = kindRank(a.kind) - kindRank(b.kind)
      if (kindDelta !== 0) return kindDelta
      return chipLabel(a).localeCompare(chipLabel(b))
    })
  }
  return grouped
}

function kindRank(kind: CalendarMarkKind) {
  if (kind === 'blocked') return 0
  if (kind === 'holiday') return 1
  return 2
}

function shortName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return value.trim() || value
  if (parts.length === 2) return parts[0]
  return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`
}

function chipLabel(mark: CalendarMark) {
  if (mark.kind === 'holiday') return mark.label ?? 'Holiday'
  if (mark.kind === 'blocked') return mark.label ?? 'Blocked'
  if (mark.leaveType === null) return 'Away'
  if (mark.personName) {
    const name = shortName(mark.personName)
    return mark.half ? `${name} · ${mark.half}` : name
  }
  if (mark.leaveType) {
    return mark.half ? `${mark.leaveType} · ${mark.half}` : mark.leaveType
  }
  return mark.label ?? 'Leave'
}

function chipTooltip(mark: CalendarMark, href?: string | null) {
  if (mark.kind === 'holiday') return mark.label ?? 'Public holiday'
  if (mark.kind === 'blocked') return mark.label ?? 'Blocked'
  const parts = [
    mark.personName,
    mark.leaveType === null ? 'Away' : mark.leaveType,
    mark.status === 'pending' ? 'Pending' : mark.status === 'approved' ? 'Approved' : undefined,
    mark.half === 'am' ? 'Morning' : mark.half === 'pm' ? 'Afternoon' : undefined,
    href ? 'Open request' : undefined,
  ].filter(Boolean)
  return parts.join(' · ') || mark.label || 'Leave'
}

function eventTone(mark: CalendarMark) {
  if (mark.kind === 'holiday') {
    return {
      bar: 'bg-stone-500',
      fill: 'bg-stone-100 text-stone-800',
    }
  }
  if (mark.kind === 'blocked') {
    return {
      bar: 'bg-rose-500',
      fill: 'bg-rose-50 text-rose-800',
    }
  }
  if (mark.leaveType === null) {
    return {
      bar: 'bg-stone-400',
      fill:
        mark.status === 'pending'
          ? 'border border-dashed border-stone-400 bg-transparent text-stone-600'
          : 'bg-muted text-muted-foreground',
    }
  }
  const colour = leaveTypeColour(mark.leaveType ?? mark.label ?? '')
  return {
    bar: leaveTypeDotClass[colour],
    fill:
      mark.status === 'pending'
        ? leaveTypePendingChipClass[colour]
        : leaveTypeChipClass[colour],
  }
}

function MarkChip({
  mark,
  href,
  className,
}: {
  mark: CalendarMark
  href?: string | null
  className?: string
}) {
  const tone = eventTone(mark)
  const chipClass = cn(
    'flex h-[18px] max-w-full min-w-0 items-stretch overflow-hidden rounded-sm text-[11px] leading-none font-medium',
    tone.fill,
    href && 'cursor-pointer text-inherit no-underline hover:brightness-95',
    className,
  )
  const body = (
    <>
      <span aria-hidden="true" className={cn('w-[3px] shrink-0', tone.bar)} />
      <span className="flex min-w-0 flex-1 items-center truncate px-1.5">
        {chipLabel(mark)}
      </span>
    </>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Link
            to={href}
            data-kind={mark.kind}
            data-status={mark.status}
            data-leave-request-id={mark.leaveRequestId}
            className={chipClass}
            onClick={(event) => event.stopPropagation()}
          >
            {body}
          </Link>
        ) : (
          <span
            data-kind={mark.kind}
            data-status={mark.status}
            className={chipClass}
          >
            {body}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{chipTooltip(mark, href)}</TooltipContent>
    </Tooltip>
  )
}

function DayMarks({
  date,
  marks,
  compact,
  hrefForMark,
}: {
  date: string
  marks: CalendarMark[]
  compact?: boolean
  hrefForMark?: (mark: CalendarMark) => string | null
}) {
  if (marks.length === 0) return null
  const visible = compact ? marks.slice(0, MAX_CHIPS) : marks
  const overflow = compact ? marks.slice(MAX_CHIPS) : []

  return (
    <div className="grid min-w-0 gap-px" data-date-marks={date}>
      {visible.map((mark, index) => (
        <MarkChip
          key={`${mark.kind}-${mark.leaveRequestId ?? mark.personId ?? mark.label ?? index}-${index}`}
          mark={mark}
          href={hrefForMark?.(mark)}
        />
      ))}
      {overflow.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-[18px] rounded-sm px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted"
            >
              +{overflow.length} more
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <PopoverHeader>
              <PopoverTitle>{formatAgendaDate(date)}</PopoverTitle>
            </PopoverHeader>
            <div className="grid gap-1">
              {marks.map((mark, index) => (
                <MarkChip
                  key={`all-${mark.kind}-${mark.leaveRequestId ?? mark.personId ?? mark.label ?? index}-${index}`}
                  mark={mark}
                  href={hrefForMark?.(mark)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}

export function formatAgendaDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('grid gap-1.5', className)} aria-label="Calendar legend">
      {CALENDAR_LEGEND.map((item) => (
        <li key={item.label} className="flex items-center gap-2.5 text-sm text-foreground">
          <span
            aria-hidden="true"
            className={cn('size-2.5 shrink-0 rounded-[3px]', item.swatchClass)}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function CalendarGrid({
  year,
  month,
  view = 'own',
  marks = [],
  onDayClick,
  onMonthChange,
  hrefForMark,
  action,
  className = '',
  today,
  selected,
}: CalendarGridProps) {
  const grouped = groupMarks(marks)
  const visibleMonth = new Date(year, month - 1, 1)
  const selectedDate = selected ? fromIso(selected) : undefined
  const daysInMonth = new Date(year, month, 0).getDate()
  const agendaDays = Array.from({ length: daysInMonth }, (_, index) => {
    const date = isoDate(year, month, index + 1)
    return { date, day: index + 1, marks: grouped.get(date) ?? [] }
  }).filter((day) => day.marks.length > 0 || day.date === today)

  function handleMonthChange(date: Date) {
    onMonthChange?.(date.getFullYear(), date.getMonth() + 1)
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return
    const iso = toIso(date)
    onDayClick?.(iso)
    if (date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      handleMonthChange(date)
    }
  }

  function TeamDay({ day, modifiers, className, children, ...props }: DayProps) {
    const date = toIso(day.date)
    const dayMarks = grouped.get(date) ?? []
    const weekend = modifiers.weekend
    const isToday = date === today
    const isSelected = date === selected

    return (
      <td
        {...props}
        data-date={date}
        data-kind={dayMarks[0]?.kind}
        data-weekend={weekend ? 'true' : 'false'}
        data-today={isToday ? 'true' : undefined}
        data-selected={isSelected ? 'true' : undefined}
        className={cn(
          className,
          'h-auto min-h-0 overflow-hidden border-r border-b border-border p-0 align-top last:border-r-0',
          weekend && 'bg-muted/35',
          isSelected && 'bg-primary/5',
          modifiers.outside && 'bg-muted/20',
        )}
      >
        <div className="flex h-full min-h-0 flex-col gap-0.5 px-1 pb-1 pt-1">
          <div className="flex justify-center">{children}</div>
          {!modifiers.outside ? (
            <DayMarks
              date={date}
              marks={dayMarks}
              compact
              hrefForMark={hrefForMark}
            />
          ) : null}
        </div>
      </td>
    )
  }

  function TeamDayButton({
    className,
    day,
    modifiers,
    ...props
  }: DayButtonProps) {
    return (
      <Button
        {...props}
        variant="ghost"
        size="icon-sm"
        data-day={toIso(day.date)}
        className={cn(
          className,
          'size-7 rounded-full border-transparent p-0 text-xs font-medium text-foreground hover:bg-muted',
          modifiers.outside && 'text-muted-foreground/50 hover:bg-transparent',
          modifiers.today &&
            'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
          modifiers.selected &&
            !modifiers.today &&
            'bg-accent text-accent-foreground',
        )}
      />
    )
  }

  function TeamMonthGrid({
    className,
    ...props
  }: ComponentProps<'table'>) {
    return (
      <table
        {...props}
        className={cn(
          'grid h-full w-full grid-cols-7 [grid-template-rows:2.25rem_repeat(6,minmax(0,1fr))]',
          className,
        )}
      />
    )
  }

  function TeamWeekdays(props: WeekdaysProps) {
    return (
      <thead className="contents">
        <tr {...props} className={cn(props.className, 'contents')} />
      </thead>
    )
  }

  function TeamWeeks(props: WeeksProps) {
    return <tbody {...props} className={cn(props.className, 'contents')} />
  }

  function TeamWeek({ week: _week, className, ...props }: WeekProps) {
    return <tr {...props} className={cn(className, 'contents')} />
  }

  return (
    <TooltipProvider>
      <div
        className={cn('grid gap-4', className)}
        data-view={view}
        data-calendar-month={`${year}-${pad(month)}`}
      >
        <div className="grid gap-3 md:hidden">
          {agendaDays.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              No leave, holidays, or blocked dates this month.
            </p>
          ) : (
            <ol className="grid gap-2">
              {agendaDays.map((day) => (
                <li key={day.date}>
                  <Card
                    size="sm"
                    className={cn(
                      'py-3',
                      day.date === selected && 'ring-2 ring-primary/40',
                    )}
                  >
                    <CardContent className="grid gap-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {formatAgendaDate(day.date)}
                        </p>
                        {day.date === today ? (
                          <span className="text-[11px] font-medium text-primary">
                            Today
                          </span>
                        ) : null}
                      </div>
                      {day.marks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nothing booked
                        </p>
                      ) : (
                        <DayMarks
                          date={day.date}
                          marks={day.marks}
                          hrefForMark={hrefForMark}
                        />
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="hidden h-full min-h-[36rem] md:block">
          <Calendar
            mode="single"
            required
            hideNavigation
            showOutsideDays
            fixedWeeks
            weekStartsOn={1}
            month={visibleMonth}
            onMonthChange={handleMonthChange}
            selected={selectedDate}
            onSelect={handleSelect}
            className="h-full w-full bg-transparent p-0 [--cell-size:--spacing(8)]"
            classNames={{
              root: 'h-full w-full',
              months: 'h-full w-full flex-col',
              month: 'flex h-full w-full flex-col gap-0',
              month_caption: 'hidden',
              nav: 'hidden',
              month_grid: 'h-full w-full border-t border-border',
              weekdays: 'border-b border-border',
              weekday:
                'flex h-9 items-center px-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase',
              week: '',
              day: 'min-h-0 p-0',
              today: 'bg-transparent',
              outside: 'bg-transparent',
              selected: 'bg-transparent',
            }}
            formatters={{
              formatWeekdayName: (date) =>
                date.toLocaleDateString(undefined, { weekday: 'short' }),
            }}
            modifiers={{
              weekend: { dayOfWeek: [0, 6] },
            }}
            components={{
              MonthGrid: TeamMonthGrid,
              Weekdays: TeamWeekdays,
              Weeks: TeamWeeks,
              Week: TeamWeek,
              Day: TeamDay,
              DayButton: TeamDayButton,
            }}
          />
        </div>
        {action ? <div className="calendar-grid-action">{action}</div> : null}
      </div>
    </TooltipProvider>
  )
}

export function SelectedDayPanel({
  date,
  marks,
  isToday,
  hrefForMark,
}: {
  date: string
  marks: CalendarMark[]
  isToday?: boolean
  hrefForMark?: (mark: CalendarMark) => string | null
}) {
  return (
    <TooltipProvider>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {formatAgendaDate(date)}
          </p>
          {isToday ? (
            <span className="text-[11px] font-medium text-primary">Today</span>
          ) : null}
        </div>
        {marks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing booked</p>
        ) : (
          <DayMarks date={date} marks={marks} hrefForMark={hrefForMark} />
        )}
      </div>
    </TooltipProvider>
  )
}
