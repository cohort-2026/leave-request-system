import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  Alert,
  Button,
  DateField,
  FileSlot,
  Select,
  TextField,
} from '../../../shared/components'
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
  type MyLeaveRequest,
  type LeaveType,
} from '../leaveApi'
import { ApiError } from '../../../services/api'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

type PreviewState = {
  key: string
  workingDaysCount?: number
  error?: string
}

export function NewLeavePage({ editMode = false }: { editMode?: boolean }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
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
        if (!cancelled) setLeaveTypes(data)
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

  const selectedType = leaveTypes.find(
    (type) => String(type.id) === selectedTypeId,
  )
  const currentBalance = selectedType
    ? balances.find(
        (balance) =>
          balance.leaveType.toLowerCase() === selectedType.name.toLowerCase(),
      )
    : null
  const invalidDateRange = Boolean(start && end && end < start)
  const previewKey =
    selectedTypeId && start && end && !invalidDateRange
      ? `${selectedTypeId}:${start}:${end}`
      : null
  const currentPreview =
    previewKey && preview?.key === previewKey ? preview : null
  const loadingPreview = Boolean(previewKey && !currentPreview)

  useEffect(() => {
    if (!previewKey) return

    const controller = new AbortController()
    previewLeave(
      Number(selectedTypeId),
      start,
      end,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setPreview({
            key: previewKey,
            workingDaysCount: result.workingDaysCount,
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

    return () => controller.abort()
  }, [previewKey, selectedTypeId, start, end])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedType || invalidDateRange || submitting) return

    setSubmitError(null)
    setSubmitFieldErrors({})
    setSubmitting(true)

    try {
      const input = {
        leaveTypeId: selectedType.id,
        start,
        end,
        reason,
        file,
        removeFile,
      }
      if (editMode && id) {
        await updateLeaveRequest(id, input)
        navigate(leaveDetailPath(id))
      } else {
        await submitLeaveRequest(input)
        navigate(paths.leave)
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
      title={editMode ? 'Edit leave request' : 'Book leave'}
      eyebrow="Staff · manager · company admin"
    >
      <p className="text-muted-foreground">
        {editMode
          ? 'Update your leave type, dates, reason, or supporting file.'
          : 'Choose your leave type and dates. Your working-day total is shown before you submit.'}
      </p>

      {typesError ? <Alert tone="error">{typesError}</Alert> : null}
      {balancesError ? <Alert tone="error">{balancesError}</Alert> : null}

      {loadingBalances ? (
        <p className="text-muted-foreground text-sm">Loading balances…</p>
      ) : null}

      <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
        {submitError ? <Alert tone="error">{submitError}</Alert> : null}
        <Select
          label="Leave type"
          name="leaveTypeId"
          value={selectedTypeId}
          error={submitFieldErrors.leaveTypeId ?? submitFieldErrors.type}
          required
          disabled={loadingTypes || Boolean(typesError)}
          onChange={(event) => setSelectedTypeId(event.target.value)}
        >
          <option value="" disabled>
            {loadingTypes ? 'Loading leave types…' : 'Choose a type'}
          </option>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>

        {selectedType && !loadingBalances && !balancesError ? (
          currentBalance ? (
            <p className="text-sm">
              Remaining for {currentBalance.leaveType}:{' '}
              <strong>{currentBalance.daysRemaining} days</strong>{' '}
              <span className="text-muted-foreground">
                ({currentBalance.usedDays} used of{' '}
                {currentBalance.totalAllowance})
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No balance found for {selectedType.name}
            </p>
          )
        ) : null}

        <DateField
          label="Start"
          name="start"
          value={start}
          required
          error={submitFieldErrors.start}
          onChange={(event) => setStart(event.target.value)}
        />
        <DateField
          label="End"
          name="end"
          value={end}
          required
          error={
            invalidDateRange
              ? 'End date must be on or after the start date.'
              : submitFieldErrors.end
          }
          onChange={(event) => setEnd(event.target.value)}
        />
        <TextField
          label="Reason"
          name="reason"
          value={reason}
          required
          maxLength={1000}
          error={submitFieldErrors.reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <FileSlot
          label="Supporting file (optional)"
          name="file"
          error={submitFieldErrors.file ?? submitFieldErrors.attachment}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0]
            setFile(selectedFile)
            if (selectedFile) setRemoveFile(false)
          }}
        />
        {editMode && editRequest?.supportingFileName ? (
          <div className="stack text-sm">
            <p>Current file: {editRequest.supportingFileName}</p>
            <label>
              <input
                type="checkbox"
                checked={removeFile}
                disabled={Boolean(file)}
                onChange={(event) => setRemoveFile(event.target.checked)}
              />{' '}
              Remove current file
            </label>
          </div>
        ) : null}
        {currentPreview?.error ? (
          <Alert tone="error">{currentPreview.error}</Alert>
        ) : null}
        {invalidDateRange ? null : loadingPreview ? (
          <p className="text-muted-foreground" role="status">
            Calculating working days…
          </p>
        ) : currentPreview?.workingDaysCount !== undefined ? (
          <p className="text-sm" role="status">
            <strong>{currentPreview.workingDaysCount} working days</strong>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-stack">
          <Button
            variant="primary"
            type="submit"
            disabled={
              loadingTypes ||
              Boolean(typesError) ||
              editLoading ||
              submitting
            }
          >
            {submitting
              ? editMode
                ? 'Saving…'
                : 'Submitting…'
              : editMode
                ? 'Save changes'
                : 'Submit request'}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              navigate(editMode && id ? leaveDetailPath(id) : paths.leave)
            }
          >
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
