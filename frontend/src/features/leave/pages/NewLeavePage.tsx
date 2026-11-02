import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  Alert,
  Button,
  DateField,
  FileSlot,
  Select,
} from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { getLeaveBalances, type LeaveBalance } from '../balancesApi'
import { ApiError } from '../../../services/api'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Could not load balances.'
}

export function NewLeavePage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState('')
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [balancesError, setBalancesError] = useState<string | null>(null)
  const [loadingBalances, setLoadingBalances] = useState(true)

  useEffect(() => {
    let cancelled = false
    getLeaveBalances()
      .then((data) => {
        if (!cancelled) setBalances(data)
      })
      .catch((err) => {
        if (!cancelled) setBalancesError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingBalances(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentBalance = selectedType
    ? balances.find(
        (b) => b.leaveType.toLowerCase() === selectedType.toLowerCase()
      )
    : null

  return (
    <PageShell title="Book leave" eyebrow="Staff · manager · company admin">
      <p className="text-muted">
        One form for every company role. Managers do not review their own
        request. Working-day count will be stored on submit; remaining days do
        not move yet.
      </p>
      <Alert tone="info">Submit is not wired yet.</Alert>

      {loadingBalances ? (
        <p className="text-muted text-sm">Loading balances…</p>
      ) : null}
      {balancesError ? <Alert tone="error">{balancesError}</Alert> : null}

      <form
        className="flex flex-col gap-stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <Select
          label="Leave type"
          name="leaveType"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="" disabled>
            Choose a type
          </option>
          <option value="Annual">Annual</option>
          <option value="Sick">Sick</option>
        </Select>

        {selectedType && !loadingBalances && !balancesError && (
          <>
            {currentBalance ? (
              <p className="text-sm">
                Remaining for {currentBalance.leaveType}:{' '}
                <strong>{currentBalance.daysRemaining} days</strong>{' '}
                <span className="text-muted">
                  ({currentBalance.usedDays} used of {currentBalance.totalAllowance})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">
                No balance found for {selectedType}
              </p>
            )}
          </>
        )}

        <DateField label="Start" name="start" />
        <DateField label="End" name="end" />
        <FileSlot label="Supporting file" name="attachment" />
        <p className="text-muted">
          Working days will show here before submit. Weekends and company
          holidays are excluded later.
        </p>
        <div className="flex flex-wrap gap-stack">
          <Button variant="primary" type="submit" disabled>
            Submit (wired later)
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(paths.leave)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  Alert,
  Button,
  DateField,
  FileSlot,
  Select,
} from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { getLeaveBalances, type LeaveBalance } from '../balancesApi'
import { ApiError } from '../../../services/api'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Could not load balances.'
}

export function NewLeavePage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState('')
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [balancesError, setBalancesError] = useState<string | null>(null)
  const [loadingBalances, setLoadingBalances] = useState(true)

  useEffect(() => {
    let cancelled = false
    getLeaveBalances()
      .then((data) => {
        if (!cancelled) setBalances(data)
      })
      .catch((err) => {
        if (!cancelled) setBalancesError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingBalances(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentBalance = selectedType
    ? balances.find(
        (b) => b.leaveType.toLowerCase() === selectedType.toLowerCase()
      )
    : null

  return (
    <PageShell title="Book leave" eyebrow="Staff · manager · company admin">
      <p className="text-muted">
        One form for every company role. Managers do not review their own
        request. Working-day count will be stored on submit; remaining days do
        not move yet.
      </p>
      <Alert tone="info">Submit is not wired yet.</Alert>

      {loadingBalances ? (
        <p className="text-muted text-sm">Loading balances…</p>
      ) : null}
      {balancesError ? <Alert tone="error">{balancesError}</Alert> : null}

      <form
        className="flex flex-col gap-stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <Select
          label="Leave type"
          name="leaveType"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="" disabled>
            Choose a type
          </option>
          <option value="Annual">Annual</option>
          <option value="Sick">Sick</option>
        </Select>

        {selectedType && !loadingBalances && !balancesError && (
          <>
            {currentBalance ? (
              <p className="text-sm">
                Remaining for {currentBalance.leaveType}:{' '}
                <strong>{currentBalance.daysRemaining} days</strong>{' '}
                <span className="text-muted">
                  ({currentBalance.usedDays} used of {currentBalance.totalAllowance})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">
                No balance found for {selectedType}
              </p>
            )}
          </>
        )}

        <DateField label="Start" name="start" />
        <DateField label="End" name="end" />
        <FileSlot label="Supporting file" name="attachment" />
        <p className="text-muted">
          Working days will show here before submit. Weekends and company
          holidays are excluded later.
        </p>
        <div className="flex flex-wrap gap-stack">
          <Button variant="primary" type="submit" disabled>
            Submit (wired later)
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(paths.leave)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}