import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert } from '../../../shared/components'
import {
  CalendarGrid,
  CalendarLegend,
  SelectedDayPanel,
  type CalendarMark,
  type CalendarView,
} from '../../../shared/components/CalendarGrid'
import { leaveDetailPath, teamReviewPath } from '../../../shared/constants/paths'
import { Button } from '../../../components/ui/button'
import { Calendar } from '../../../components/ui/calendar'
import { Separator } from '../../../components/ui/separator'
import { Skeleton } from '../../../components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs'
import { ApiError } from '../../../services/api'
import { listDepartments, type Department } from '../../people/departmentsApi'
import {
  fetchCalendarMarks,
  monthBounds,
  type CalendarScope,
} from '../calendarApi'

function todayParts() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  }
}

function monthTitle(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function defaultScope(role: string | undefined): CalendarScope {
  return role === 'company_admin' ? 'company' : 'team'
}

function viewFor(role: string | undefined, scope: CalendarScope): CalendarView {
  if (role === 'staff') return 'own'
  if (scope === 'company' || role === 'company_admin') return 'org'
  return 'team'
}

function fromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function CalendarPage() {
  const { session } = useAuth()
  const initial = todayParts()
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDate, setSelectedDate] = useState(initial.date)
  const [scope, setScope] = useState<CalendarScope>(() => defaultScope(session?.role))
  const [departmentId, setDepartmentId] = useState<string>('all')
  const [departments, setDepartments] = useState<Department[]>([])
  const [marks, setMarks] = useState<Awaited<ReturnType<typeof fetchCalendarMarks>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = initial.date
  const view = viewFor(session?.role, scope)
  const canFilterCompany = session?.role === 'manager' || session?.role === 'company_admin'
  const canFilterDepartment = session?.role === 'company_admin'
  const selectedDepartmentId =
    canFilterDepartment && departmentId !== 'all' ? Number(departmentId) : null
  const visibleMonth = new Date(year, month - 1, 1)
  const selectedMarks = useMemo(
    () => marks.filter((mark) => mark.date === selectedDate),
    [marks, selectedDate],
  )

  useEffect(() => {
    if (!canFilterDepartment) return
    let active = true
    listDepartments()
      .then((rows) => {
        if (active) setDepartments(rows)
      })
      .catch(() => {
        if (active) setDepartments([])
      })
    return () => {
      active = false
    }
  }, [canFilterDepartment])

  useEffect(() => {
    let active = true
    const bounds = monthBounds(year, month)
    setLoading(true)
    setError(null)
    fetchCalendarMarks({
      ...bounds,
      scope: canFilterCompany ? scope : 'team',
      departmentId: selectedDepartmentId,
      viewerId: session?.id,
      viewerRole: session?.role,
    })
      .then((data) => {
        if (active) setMarks(data)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load the team calendar.',
          )
          setMarks([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [year, month, selectedDepartmentId, session?.id, session?.role, canFilterCompany, scope])

  function goToOffset(offset: number) {
    const next = new Date(year, month - 1 + offset, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth() + 1)
  }

  function goToMonth(date: Date) {
    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
  }

  function goToToday() {
    const now = todayParts()
    setYear(now.year)
    setMonth(now.month)
    setSelectedDate(now.date)
  }

  function selectDay(date: string) {
    setSelectedDate(date)
  }

  const hrefForMark = useCallback(
    (mark: CalendarMark) => {
      if (mark.kind !== 'leave' || mark.leaveRequestId == null) return null
      if (mark.leaveType === null && mark.personId !== session?.id) return null
      const id = String(mark.leaveRequestId)
      const isOwn = session?.id != null && mark.personId === session.id
      if (isOwn || session?.role === 'staff') return leaveDetailPath(id)
      if (session?.role === 'manager' || session?.role === 'company_admin') {
        return teamReviewPath(id)
      }
      return leaveDetailPath(id)
    },
    [session?.id, session?.role],
  )

  const isCurrentMonth = year === initial.year && month === initial.month

  return (
    <section className="-mx-4 flex min-h-[calc(100svh-6rem)] flex-col overflow-hidden bg-card ring-1 ring-border md:-mx-6 md:h-[calc(100svh-4.5rem)] md:min-h-0 md:max-h-[calc(100svh-4.5rem)]">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
          <div className="p-3">
            <Calendar
              mode="single"
              required
              showOutsideDays
              weekStartsOn={1}
              month={visibleMonth}
              onMonthChange={goToMonth}
              selected={fromIso(selectedDate)}
              onSelect={(date) => {
                if (!date) return
                const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                setSelectedDate(iso)
                goToMonth(date)
              }}
              className="w-full p-0 [--cell-size:--spacing(8)]"
            />
          </div>
          <Separator />
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="grid gap-2">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Calendars
              </p>
              <CalendarLegend />
            </div>
            <Separator />
            <SelectedDayPanel
              date={selectedDate}
              marks={selectedMarks}
              isToday={selectedDate === today}
              hrefForMark={hrefForMark}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToToday}
                disabled={isCurrentMonth && selectedDate === today}
              >
                Today
              </Button>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => goToOffset(-1)}
                  aria-label="Previous month"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => goToOffset(1)}
                  aria-label="Next month"
                >
                  <ChevronRight />
                </Button>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {monthTitle(year, month)}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canFilterCompany ? (
                <Tabs
                  value={scope}
                  onValueChange={(value) => setScope(value as CalendarScope)}
                >
                  <TabsList>
                    <TabsTrigger value="team">My team</TabsTrigger>
                    <TabsTrigger value="company">Company</TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your leave and public holidays. Colleagues show as Away.
                </p>
              )}

              {canFilterDepartment && departments.length > 0 ? (
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="w-44" aria-label="Department">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:overflow-hidden md:p-0">
            <div className="mb-4 md:hidden">
              <CalendarLegend className="grid-cols-2 sm:grid-cols-3" />
            </div>
            {error ? (
              <div className="p-4">
                <Alert tone="error">{error}</Alert>
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-3 p-4">
                <div className="grid gap-2 md:hidden">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
                <div className="hidden h-full md:block">
                  <div className="grid h-[calc(100svh-10rem)] grid-cols-7 grid-rows-6 gap-px bg-border">
                    {Array.from({ length: 42 }, (_, index) => (
                      <Skeleton key={index} className="rounded-none bg-card" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <CalendarGrid
                year={year}
                month={month}
                view={view}
                marks={marks}
                today={today}
                selected={selectedDate}
                onDayClick={selectDay}
                hrefForMark={hrefForMark}
                onMonthChange={(nextYear, nextMonth) => {
                  setYear(nextYear)
                  setMonth(nextMonth)
                }}
                className="h-full gap-0"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
