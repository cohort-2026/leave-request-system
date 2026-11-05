import { useEffect, useState, type FormEvent } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { ApiError } from '../../../services/api'
import {
  Alert,
  Button,
  DataTable,
  DateField,
  TextField,
  type DataTableColumn,
} from '../../../shared/components'
import {
  createPublicHoliday,
  deletePublicHoliday,
  getCalendarSettings,
  saveWorkingDays,
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function holidayColumns(
  removingHolidayId: number | null,
  onRemove: (holiday: PublicHoliday) => void,
): DataTableColumn<PublicHoliday>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      render: (holiday) => holiday.date,
    },
    {
      key: 'name',
      header: 'Name',
      render: (holiday) => holiday.name,
    },
    {
      key: 'remove',
      header: '',
      className: 'cell-action',
      render: (holiday) => (
        <Button
          type="button"
          variant="secondary"
          onClick={() => onRemove(holiday)}
          disabled={removingHolidayId !== null}
          aria-label={`Remove ${holiday.name} on ${holiday.date}`}
        >
          {removingHolidayId === holiday.id ? 'Removing…' : 'Remove'}
        </Button>
      ),
    },
  ]
}

export function CalendarSettingsPage() {
  const [calendar, setCalendar] = useState<CalendarSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [savingWeek, setSavingWeek] = useState(false)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [addingHoliday, setAddingHoliday] = useState(false)
  const [removingHolidayId, setRemovingHolidayId] = useState<number | null>(
    null,
  )

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
    setNotice(null)
  }

  async function handleSaveWeek() {
    if (!calendar) return

    setSavingWeek(true)
    setError(null)
    setNotice(null)
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
      setNotice('Working days saved.')
    } catch (saveFailure: unknown) {
      setError(getErrorMessage(saveFailure, 'Could not save working days.'))
    } finally {
      setSavingWeek(false)
    }
  }

  async function handleAddHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!calendar) return

    setAddingHoliday(true)
    setError(null)
    setNotice(null)
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
      setNotice('Holiday added.')
    } catch (addFailure: unknown) {
      setError(getErrorMessage(addFailure, 'Could not add the holiday.'))
    } finally {
      setAddingHoliday(false)
    }
  }

  async function handleRemoveHoliday(holiday: PublicHoliday) {
    setRemovingHolidayId(holiday.id)
    setError(null)
    setNotice(null)
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
      setNotice(`${holiday.name} removed.`)
    } catch (removeFailure: unknown) {
      setError(getErrorMessage(removeFailure, 'Could not remove the holiday.'))
    } finally {
      setRemovingHolidayId(null)
    }
  }

  return (
    <PageShell title="Week and holidays" eyebrow="Company admin">
      <p className="muted">
        Which weekdays count, and public holidays that do not count. A holiday
        is not a blocked date.
      </p>
      {loadError ? (
        <>
          <Alert tone="error">{loadError}</Alert>
          <Button type="button" onClick={() => void loadCalendar()}>
            Try again
          </Button>
        </>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {loading ? (
        <p className="muted">Loading calendar settings…</p>
      ) : calendar ? (
        <div className="calendar-settings">
          <section className="stack" aria-labelledby="working-days-heading">
            <h2 id="working-days-heading">Working days</h2>
            <div className="check-list">
              {WEEKDAYS.map(({ field, label }) => (
                <label key={field} className="check-row" htmlFor={field}>
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

          <section className="stack" aria-labelledby="public-holidays-heading">
            <h2 id="public-holidays-heading">Public holidays</h2>
            <p className="muted">
              Holidays are excluded from the day count; they are not blocked
              dates.
            </p>
            <div className="calendar-settings-table">
              <DataTable
                data={calendar.holidays}
                keyExtractor={(holiday) => String(holiday.id)}
                emptyTitle="No public holidays"
                emptyDescription="Add a holiday date for your company."
                columns={holidayColumns(removingHolidayId, (holiday) => {
                  void handleRemoveHoliday(holiday)
                })}
              />
            </div>
            <form
              className="stack"
              onSubmit={(event) => void handleAddHoliday(event)}
            >
              <DateField
                label="Holiday date"
                name="holidayDate"
                value={holidayDate}
                onChange={(event) => setHolidayDate(event.target.value)}
                required
                disabled={addingHoliday}
              />
              <TextField
                label="Holiday name"
                name="holidayName"
                value={holidayName}
                onChange={(event) => setHolidayName(event.target.value)}
                maxLength={120}
                required
                disabled={addingHoliday}
              />
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
