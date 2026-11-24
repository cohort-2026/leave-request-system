import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageShell } from '../../../app/layouts/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import {
  createPublicHoliday,
  deletePublicHoliday,
  getCalendarSettings,
  saveWorkingDays,
  seedZaHolidays,
  type CalendarSettings,
  type PublicHoliday,
  type WorkingDaySettings,
} from '../calendarSettingsApi'

const WEEKDAYS: {
  field: keyof WorkingDaySettings
  label: string
}[] = [
  { field: 'mondayIsWorking', label: 'Monday' },
  { field: 'tuesdayIsWorking', label: 'Tuesday' },
  { field: 'wednesdayIsWorking', label: 'Wednesday' },
  { field: 'thursdayIsWorking', label: 'Thursday' },
  { field: 'fridayIsWorking', label: 'Friday' },
  { field: 'saturdayIsWorking', label: 'Saturday' },
  { field: 'sundayIsWorking', label: 'Sunday' },
]

const HOLIDAY_YEARS = [2026, 2027, 2028, 2029, 2030] as const

function defaultHolidayYear(): number {
  const current = new Date().getFullYear()
  return (HOLIDAY_YEARS as readonly number[]).includes(current)
    ? current
    : HOLIDAY_YEARS[0]
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function holidayYear(date: string): number {
  return Number(date.slice(0, 4))
}

function formatObserved(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  const weekday = parsed.toLocaleDateString('en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const day = parsed.getUTCDate()
  const month = parsed.toLocaleDateString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  })
  return `${weekday} ${day} ${month}`
}

function seedToastMessage(
  added: number,
  observed: Array<{ name: string; date: string }>,
): string {
  const womensDay = observed.find((holiday) => holiday.name === "Women's Day")
  const addedLabel = `${added} holiday${added === 1 ? '' : 's'} added`
  if (womensDay) {
    return `${addedLabel} · Women's Day observed ${formatObserved(womensDay.date)}`
  }
  return addedLabel
}

export function CalendarSettingsPage() {
  const [calendar, setCalendar] = useState<CalendarSettings | null>(null)
  const [year, setYear] = useState<number>(defaultHolidayYear)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingWeek, setSavingWeek] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [addingHoliday, setAddingHoliday] = useState(false)
  const [removingHolidayId, setRemovingHolidayId] = useState<number | null>(
    null,
  )

  const yearHolidays = useMemo(() => {
    if (!calendar) return []
    return calendar.holidays.filter(
      (holiday) => holidayYear(holiday.date) === year,
    )
  }, [calendar, year])

  async function loadCalendar() {
    setLoading(true)
    setLoadError(null)
    try {
      setCalendar(await getCalendarSettings())
    } catch (loadFailure: unknown) {
      setLoadError(
        getErrorMessage(loadFailure, 'Could not load calendar settings.'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    getCalendarSettings()
      .then((settings) => {
        if (!cancelled) setCalendar(settings)
      })
      .catch((loadFailure: unknown) => {
        if (!cancelled) {
          setLoadError(
            getErrorMessage(loadFailure, 'Could not load calendar settings.'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function updateWeekday(field: keyof WorkingDaySettings, checked: boolean) {
    setCalendar((current) =>
      current ? { ...current, [field]: checked } : current,
    )
    setError(null)
  }

  async function handleSaveWeek() {
    if (!calendar) return

    setSavingWeek(true)
    setError(null)
    const settings: WorkingDaySettings = {
      mondayIsWorking: calendar.mondayIsWorking,
      tuesdayIsWorking: calendar.tuesdayIsWorking,
      wednesdayIsWorking: calendar.wednesdayIsWorking,
      thursdayIsWorking: calendar.thursdayIsWorking,
      fridayIsWorking: calendar.fridayIsWorking,
      saturdayIsWorking: calendar.saturdayIsWorking,
      sundayIsWorking: calendar.sundayIsWorking,
    }

    try {
      const saved = await saveWorkingDays(settings)
      setCalendar((current) =>
        current ? { ...current, ...saved, holidays: current.holidays } : saved,
      )
      toast.success('Working days saved.')
    } catch (saveFailure: unknown) {
      setError(getErrorMessage(saveFailure, 'Could not save working days.'))
    } finally {
      setSavingWeek(false)
    }
  }

  async function handleSeedZa() {
    setSeeding(true)
    setError(null)
    try {
      const result = await seedZaHolidays(year)
      setCalendar((current) =>
        current ? { ...current, holidays: result.holidays } : current,
      )
      toast.success(seedToastMessage(result.added, result.observed))
    } catch (seedFailure: unknown) {
      setError(
        getErrorMessage(seedFailure, 'Could not load SA public holidays.'),
      )
    } finally {
      setSeeding(false)
    }
  }

  async function handleAddHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!calendar) return

    setAddingHoliday(true)
    setError(null)
    try {
      const result = await createPublicHoliday(holidayDate, holidayName)
      setCalendar((current) =>
        current
          ? {
              ...current,
              holidays: [...current.holidays, result.holiday].sort((a, b) =>
                a.date.localeCompare(b.date),
              ),
            }
          : current,
      )
      setHolidayDate('')
      setHolidayName('')
      toast.success('Holiday added.')
    } catch (addFailure: unknown) {
      setError(getErrorMessage(addFailure, 'Could not add the holiday.'))
    } finally {
      setAddingHoliday(false)
    }
  }

  async function handleRemoveHoliday(holiday: PublicHoliday) {
    setRemovingHolidayId(holiday.id)
    setError(null)
    try {
      await deletePublicHoliday(holiday.id)
      setCalendar((current) =>
        current
          ? {
              ...current,
              holidays: current.holidays.filter(
                (item) => item.id !== holiday.id,
              ),
            }
          : current,
      )
      toast.success(`${holiday.name} removed.`)
    } catch (removeFailure: unknown) {
      setError(getErrorMessage(removeFailure, 'Could not remove the holiday.'))
    } finally {
      setRemovingHolidayId(null)
    }
  }

  return (
    <PageShell title="Week and holidays" eyebrow="Company admin">
      <p className="text-muted-foreground">
        Which weekdays count, and public holidays that do not count. A holiday
        is not a blocked date.
      </p>
      {loadError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Alert tone="error">{loadError}</Alert>
          <Button type="button" variant="outline" onClick={() => void loadCalendar()}>
            Try again
          </Button>
        </div>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading calendar settings…
        </p>
      ) : calendar ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <section className="space-y-4" aria-labelledby="working-days-heading">
            <h2 id="working-days-heading" className="text-base font-semibold">
              Working days
            </h2>
            <div className="space-y-2">
              {WEEKDAYS.map(({ field, label }) => (
                <label
                  key={field}
                  className="flex items-center gap-3 text-sm"
                  htmlFor={field}
                >
                  <input
                    id={field}
                    type="checkbox"
                    name={field}
                    checked={calendar[field]}
                    disabled={savingWeek}
                    onChange={(event) =>
                      updateWeekday(field, event.target.checked)
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => void handleSaveWeek()}
              disabled={savingWeek}
            >
              {savingWeek ? 'Saving…' : 'Save working days'}
            </Button>
          </section>

          <section className="space-y-4" aria-labelledby="public-holidays-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="public-holidays-heading"
                  className="text-base font-semibold"
                >
                  Public holidays
                </h2>
                <p className="text-sm text-muted-foreground">
                  South African public holidays load automatically. They are
                  excluded from the day count; they are not blocked dates.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSeedZa()}
                disabled={seeding}
              >
                {seeding
                  ? 'Restoring…'
                  : `Restore missing SA holidays ${year}`}
              </Button>
            </div>

            <Tabs
              value={String(year)}
              onValueChange={(value: string) => setYear(Number(value))}
            >
              <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
                {HOLIDAY_YEARS.map((holidayYearValue) => (
                  <TabsTrigger
                    key={holidayYearValue}
                    value={String(holidayYearValue)}
                  >
                    {holidayYearValue}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {yearHolidays.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <h3 className="m-0 text-base font-semibold">
                  No public holidays in {year}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Restore the South African set or add a company date.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearHolidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="tabular-nums">
                        {holiday.date}
                        {holiday.actualDate ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Observed from {holiday.actualDate}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium">
                        {holiday.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            holiday.source === 'za' ? 'secondary' : 'outline'
                          }
                        >
                          {holiday.source === 'za' ? 'SA' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRemoveHoliday(holiday)}
                          disabled={removingHolidayId !== null}
                          aria-label={`Remove ${holiday.name} on ${holiday.date}`}
                        >
                          {removingHolidayId === holiday.id
                            ? 'Removing…'
                            : 'Remove'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form
              className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end"
              onSubmit={(event) => void handleAddHoliday(event)}
            >
              <label className="grid gap-1 text-sm">
                <span>Holiday date</span>
                <input
                  type="date"
                  name="holidayDate"
                  value={holidayDate}
                  required
                  disabled={addingHoliday}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => setHolidayDate(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Holiday name</span>
                <input
                  type="text"
                  name="holidayName"
                  value={holidayName}
                  maxLength={120}
                  required
                  disabled={addingHoliday}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => setHolidayName(event.target.value)}
                />
              </label>
              <Button
                type="submit"
                disabled={addingHoliday || !holidayDate || !holidayName.trim()}
              >
                {addingHoliday ? 'Adding…' : 'Add holiday'}
              </Button>
            </form>
          </section>
        </div>
      ) : null}
    </PageShell>
  )
}
