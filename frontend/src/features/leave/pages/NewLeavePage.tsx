import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button } from '../../../components/ui/button'
import { Calendar } from '../../../components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group'
import { Textarea } from '../../../components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group'
import { Alert } from '../../../shared/components'
import {
  leaveDetailPath,
  paths,
} from '../../../shared/constants/paths'
import { getLeaveBalances, type LeaveBalance } from '../balancesApi'
import {
  getLeaveTypes,
  fetchMyLeaveRequest,
  previewLeave,
  submitLeaveRequest,
  updateLeaveRequest,
  type DayPart,
  type LeavePreviewResponse,
  type LeaveType,
  type MyLeaveRequest,
} from '../leaveApi'
import { ApiError } from '../../../services/api'
import { cn } from '../../../lib/utils'

const PREVIEW_DEBOUNCE_MS = 300
const ACCEPTED_FILES = '.pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic'
const DAY_PARTS: { value: DayPart; label: string }[] = [
  { value: 'full', label: 'Full day' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
]

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateLabel(value: string) {
  const date = fromIsoDate(value)
  if (!date) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function reasonIsRequired(typeName: string) {
  const name = typeName.toLowerCase()
  return name.includes('unpaid') || name.includes('study')
}

function withLeaveTypeIds(
  balances: LeaveBalance[],
  types: LeaveType[],
): LeaveBalance[] {
  return balances.map((balance) => {
    if (balance.leaveTypeId) return balance
    const match = types.find(
      (type) => type.name.toLowerCase() === balance.leaveType.toLowerCase(),
    )
    return match ? { ...balance, leaveTypeId: match.id } : balance
  })
}

function matchBalance(balances: LeaveBalance[], type: LeaveType) {
  return balances.find((balance) => balance.leaveTypeId === type.id) ?? null
}

function excludedDatesFrom(preview: LeavePreviewResponse) {
  const fromList = preview.excludedDates ?? []
  const fromHolidays = (preview.holidays ?? []).map(
    (holiday) => holiday.date,
  )
  return [...new Set([...fromList, ...fromHolidays].filter(Boolean))]
}

function noticeWarningsFrom(preview: LeavePreviewResponse) {
  const warnings = preview.noticeWarnings ?? []
  if (preview.noticeWarning) warnings.push(preview.noticeWarning)
  return warnings.filter(Boolean)
}

type PreviewState = {
  key: string
  data?: LeavePreviewResponse
  error?: string
}

export function NewLeavePage({ editMode = false }: { editMode?: boolean }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [startPart, setStartPart] = useState<DayPart>('full')
  const [endPart, setEndPart] = useState<DayPart>('full')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | undefined>()
  const [removeFile, setRemoveFile] = useState(false)
  const [editRequest, setEditRequest] = useState<MyLeaveRequest | null>(null)
  const [editLoading, setEditLoading] = useState(Boolean(editMode && id))
  const [editLoadError, setEditLoadError] = useState<string | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [typesError, setTypesError] = useState<string | null>(null)
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [balancesError, setBalancesError] = useState<string | null>(null)
  const [loadingBalances, setLoadingBalances] = useState(true)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitFieldErrors, setSubmitFieldErrors] = useState<
    Record<string, string>
  >({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!editMode || !id) return

    let active = true
    fetchMyLeaveRequest(id)
      .then((request) => {
        if (active) {
          setEditRequest(request)
          setSelectedTypeId(String(request.leaveTypeId))
          setStart(request.startDate)
          setEnd(request.endDate)
          setReason(request.reason ?? '')
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setEditLoadError(
            getErrorMessage(err, 'Could not load this leave request.'),
          )
        }
      })
      .finally(() => {
        if (active) setEditLoading(false)
      })
    return () => {
      active = false
    }
  }, [editMode, id])

  useEffect(() => {
    let cancelled = false
    getLeaveTypes()
      .then((data) => {
        if (!cancelled) setLeaveTypes(data.filter((type) => type.isActive !== false))
      })
      .catch((err) => {
        if (!cancelled) {
          setTypesError(getErrorMessage(err, 'Could not load leave types.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getLeaveBalances()
      .then((data) => {
        if (!cancelled) setBalances(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setBalancesError(getErrorMessage(err, 'Could not load balances.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBalances(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const balancesWithIds = useMemo(
    () => withLeaveTypeIds(balances, leaveTypes),
    [balances, leaveTypes],
  )
  const selectedType = leaveTypes.find(
    (type) => String(type.id) === selectedTypeId,
  )
  const currentBalance = selectedType
    ? matchBalance(balancesWithIds, selectedType)
    : null
  const invalidDateRange = Boolean(start && end && end < start)
  const previewKey =
    selectedTypeId && start && end && !invalidDateRange
      ? `${selectedTypeId}:${start}:${end}:${startPart}:${endPart}`
      : null
  const currentPreview =
    previewKey && preview?.key === previewKey ? preview : null
  const loadingPreview = Boolean(previewKey && !currentPreview)
  const workingDays = currentPreview?.data?.workingDaysCount
  const remainingDays = currentBalance?.daysRemaining
  const overBalance =
    workingDays !== undefined &&
    remainingDays !== undefined &&
    workingDays > remainingDays
  const zeroDays = workingDays === 0
  const needsReason = selectedType
    ? reasonIsRequired(selectedType.name)
    : false
  const documentRequiredAfter = selectedType?.requiresDocumentAfterDays
  const documentRequired =
    currentPreview?.data?.documentRequired ??
    (documentRequiredAfter != null &&
      workingDays !== undefined &&
      workingDays >= documentRequiredAfter)
  const missingReason = needsReason && reason.trim().length === 0
  const missingFile =
    documentRequired && !file && !(editMode && editRequest?.supportingFileName && !removeFile)
  const submitDisabled =
    loadingTypes ||
    Boolean(typesError) ||
    editLoading ||
    submitting ||
    !selectedType ||
    !start ||
    !end ||
    invalidDateRange ||
    loadingPreview ||
    Boolean(currentPreview?.error) ||
    workingDays === undefined ||
    zeroDays ||
    overBalance ||
    missingReason ||
    missingFile

  useEffect(() => {
    if (!previewKey) return

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      previewLeave(
        Number(selectedTypeId),
        start,
        end,
        controller.signal,
        { startPart, endPart },
      )
        .then((result) => {
          if (!controller.signal.aborted) {
            setPreview({
              key: previewKey,
              data: result,
            })
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setPreview({
              key: previewKey,
              error: getErrorMessage(error, 'Could not preview working days.'),
            })
          }
        })
    }, PREVIEW_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [previewKey, selectedTypeId, start, end, startPart, endPart])

  const excludedDates = useMemo(
    () => (currentPreview?.data ? excludedDatesFrom(currentPreview.data) : []),
    [currentPreview],
  )
  const noticeWarnings = useMemo(
    () => (currentPreview?.data ? noticeWarningsFrom(currentPreview.data) : []),
    [currentPreview],
  )
  const approverName =
    currentPreview?.data?.approverName ??
    currentPreview?.data?.reviewerName ??
    null
  const documentRule =
    currentPreview?.data?.documentRule ??
    (documentRequiredAfter == null
      ? 'No supporting file is required for this type.'
      : documentRequiredAfter === 0
        ? 'A supporting file is required.'
        : `A supporting file is required after ${documentRequiredAfter} working days.`)
  const balanceAfter =
    remainingDays !== undefined && workingDays !== undefined
      ? remainingDays - workingDays
      : null

  const selectedRange = {
    from: start ? fromIsoDate(start) : undefined,
    to: end ? fromIsoDate(end) : undefined,
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedType || invalidDateRange || submitting || submitDisabled) return

    setSubmitError(null)
    setSubmitFieldErrors({})
    setSubmitting(true)

    try {
      const input = {
        leaveTypeId: selectedType.id,
        start,
        end,
        startPart,
        endPart,
        reason,
        file,
        removeFile,
      }
      if (editMode && id) {
        await updateLeaveRequest(id, input)
        toast.success('Leave request updated')
        navigate(leaveDetailPath(id))
      } else {
        const created = await submitLeaveRequest(input)
        toast.success('Leave request submitted')
        navigate(leaveDetailPath(created.id))
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        setSubmitFieldErrors(error.fieldErrors)
      } else {
        setSubmitError(
          editMode
            ? 'Could not update leave request.'
            : 'Could not submit leave request.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (editMode && !id) {
    return (
      <PageShell title="Edit leave request" eyebrow="Mine">
        <Alert tone="error">A leave request ID is required.</Alert>
        <p>
          <Link to={paths.leave}>Back to my leave</Link>
        </p>
      </PageShell>
    )
  }

  if (editMode && (editLoading || editRequest?.id !== id)) {
    return (
      <PageShell title="Edit leave request" eyebrow="Mine">
        <p className="text-muted-foreground">Loading leave request…</p>
      </PageShell>
    )
  }

  if (editMode && (editLoadError || !editRequest)) {
    return (
      <PageShell title="Edit leave request" eyebrow="Mine">
        <Alert tone="error">
          {editLoadError ?? 'Leave request not found.'}
        </Alert>
        <p>
          <Link to={paths.leave}>Back to my leave</Link>
        </p>
      </PageShell>
    )
  }

  if (editMode && editRequest?.status !== 'pending') {
    return (
      <PageShell title="Edit leave request" eyebrow="Mine">
        <Alert tone="error">
          Only pending requests can be changed.
        </Alert>
        <p>
          <Link to={leaveDetailPath(id ?? '')}>Back to request</Link>
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={editMode ? 'Edit leave request' : 'Request leave'}
      eyebrow="Staff · manager · company admin"
    >
      <p className="text-muted-foreground">
        {editMode
          ? 'Update your leave type, dates, reason, or supporting file.'
          : 'Choose a leave type and dates. The summary updates before you submit.'}
      </p>

      {typesError ? <Alert tone="error">{typesError}</Alert> : null}
      {balancesError ? <Alert tone="error">{balancesError}</Alert> : null}

      <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" onSubmit={handleSubmit}>
        <FieldGroup className="gap-6">
          {submitError ? <Alert tone="error">{submitError}</Alert> : null}

          <FieldSet>
            <FieldLegend>Leave type</FieldLegend>
            <FieldDescription>
              Available days are shown on each type.
            </FieldDescription>
            {loadingTypes ? (
              <p className="text-muted-foreground text-sm">Loading leave types…</p>
            ) : (
              <RadioGroup
                className="grid gap-3 sm:grid-cols-2"
                value={selectedTypeId}
                onValueChange={setSelectedTypeId}
                disabled={Boolean(typesError)}
                name="leaveTypeId"
              >
                {leaveTypes.map((type) => {
                  const balance = matchBalance(balancesWithIds, type)
                  const remaining = loadingBalances
                    ? '…'
                    : balance
                      ? `${balance.daysRemaining} days available`
                      : 'No balance'
                  const selected = selectedTypeId === String(type.id)
                  return (
                    <FieldLabel
                      key={type.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedTypeId(String(type.id))}
                    >
                      <Field
                        orientation="horizontal"
                        className={cn(
                          'items-start rounded-xl border p-3 transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                            : 'border-border',
                        )}
                        data-invalid={Boolean(
                          submitFieldErrors.leaveTypeId ?? submitFieldErrors.type,
                        )}
                      >
                        <RadioGroupItem
                          id={`leave-type-${type.id}`}
                          value={String(type.id)}
                          className={
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : undefined
                          }
                        />
                        <FieldContent>
                          <span className="font-medium">{type.name}</span>
                          <FieldDescription>{remaining}</FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  )
                })}
              </RadioGroup>
            )}
            <FieldError>
              {submitFieldErrors.leaveTypeId ?? submitFieldErrors.type}
            </FieldError>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Dates</FieldLegend>
            <FieldDescription>
              Select a start and end date, then set Full day, Morning, or Afternoon on each edge.
            </FieldDescription>
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={(range) => {
                setStart(range?.from ? toIsoDate(range.from) : '')
                setEnd(
                  range?.to
                    ? toIsoDate(range.to)
                    : range?.from
                      ? toIsoDate(range.from)
                      : '',
                )
              }}
              numberOfMonths={1}
              className="rounded-xl border"
            />
            {invalidDateRange ? (
              <FieldError>End date must be on or after the start date.</FieldError>
            ) : null}
            <FieldError>{submitFieldErrors.start ?? submitFieldErrors.end}</FieldError>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Start {start ? `(${formatDateLabel(start)})` : ''}</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={startPart}
                  onValueChange={(value) => {
                    if (value) setStartPart(value as DayPart)
                  }}
                  variant="outline"
                  spacing={0}
                  disabled={!start}
                >
                  {DAY_PARTS.map((part) => (
                    <ToggleGroupItem key={part.value} value={part.value}>
                      {part.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel>End {end ? `(${formatDateLabel(end)})` : ''}</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={endPart}
                  onValueChange={(value) => {
                    if (value) setEndPart(value as DayPart)
                  }}
                  variant="outline"
                  spacing={0}
                  disabled={!end}
                >
                  {DAY_PARTS.map((part) => (
                    <ToggleGroupItem key={part.value} value={part.value}>
                      {part.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
            </div>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="leave-reason">
              Reason {needsReason ? '' : '(optional)'}
            </FieldLabel>
            <Textarea
              id="leave-reason"
              name="reason"
              value={reason}
              required={needsReason}
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={Boolean(submitFieldErrors.reason)}
            />
            <FieldDescription>
              {needsReason
                ? 'Required for Unpaid and Study leave.'
                : 'Optional for Annual leave.'}
            </FieldDescription>
            <FieldError>{submitFieldErrors.reason}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="leave-file">Supporting file</FieldLabel>
            <Input
              id="leave-file"
              name="file"
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0]
                setFile(selectedFile)
                if (selectedFile) setRemoveFile(false)
              }}
              aria-invalid={Boolean(
                submitFieldErrors.file ?? submitFieldErrors.attachment,
              )}
            />
            <FieldDescription>
              PDF, JPG, PNG, or HEIC. {documentRule}
              {documentRequired ? ' Attach a sick note or supporting document before you submit.' : ''}
            </FieldDescription>
            <FieldError>
              {submitFieldErrors.file ?? submitFieldErrors.attachment}
            </FieldError>
            {editMode && editRequest?.supportingFileName ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={removeFile}
                  disabled={Boolean(file)}
                  onChange={(event) => setRemoveFile(event.target.checked)}
                />
                Remove current file ({editRequest.supportingFileName})
              </label>
            ) : null}
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitDisabled}>
              {submitting
                ? editMode
                  ? 'Saving…'
                  : 'Submitting…'
                : editMode
                  ? 'Save changes'
                  : 'Submit request'}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() =>
                navigate(editMode && id ? leaveDetailPath(id) : paths.leave)
              }
            >
              Cancel
            </Button>
          </div>
        </FieldGroup>

        <Card size="sm" className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              Live preview of this request.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {currentPreview?.error ? (
              <Alert tone="error">{currentPreview.error}</Alert>
            ) : null}
            {invalidDateRange ? null : loadingPreview ? (
              <p className="text-muted-foreground" role="status">
                Calculating working days…
              </p>
            ) : workingDays !== undefined ? (
              <p role="status">
                <strong>{workingDays} working days</strong>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Choose a type and dates to preview working days.
              </p>
            )}
            <div>
              <p className="font-medium">Excluded dates</p>
              {excludedDates.length > 0 ? (
                <ul className="mt-1 list-disc pl-4">
                  {excludedDates.map((date) => (
                    <li key={date}>{formatDateLabel(date)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  Holidays skipped here once the preview API lists them.
                </p>
              )}
            </div>
            <div>
              <p className="font-medium">Balance after</p>
              <p className="text-muted-foreground">
                {balanceAfter == null
                  ? 'Select a type with a balance to see remaining days after this request.'
                  : `${balanceAfter} days remaining`}
              </p>
              {overBalance ? (
                <p className="text-destructive">
                  This request is over your available balance.
                </p>
              ) : null}
              {zeroDays ? (
                <p className="text-destructive">
                  Submit is disabled at 0 working days.
                </p>
              ) : null}
            </div>
            <div>
              <p className="font-medium">Approver</p>
              <p className="text-muted-foreground">
                {approverName ?? 'Shown here once the preview API returns an approver.'}
              </p>
            </div>
            <div>
              <p className="font-medium">Document rule</p>
              <p className="text-muted-foreground">{documentRule}</p>
            </div>
            {noticeWarnings.length > 0 ? (
              <div>
                <p className="font-medium">Notice</p>
                <ul className="mt-1 list-disc pl-4">
                  {noticeWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </PageShell>
  )
}
