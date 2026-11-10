import { useEffect, useState, type FormEvent } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { ApiError } from '../../../services/api'
import { Alert, Button, Select, TextField } from '../../../shared/components'
import {
  getCompanyLeaveRules,
  saveCompanyLeaveRules,
  type CompanyLeaveRules,
  type StaffReviewer,
} from '../rulesApi'

type RulesForm = Omit<
  CompanyLeaveRules,
  'minNoticeDays' | 'escalateAfterHours' | 'autoApproveAfterHours'
> & {
  minNoticeDays: number | ''
  escalateAfterHours: number | ''
  autoApproveAfterHours: number | ''
}

function isStaffReviewer(value: string): value is StaffReviewer {
  return value === 'manager' || value === 'company_admin'
}

export function RulesPage() {
  const [rules, setRules] = useState<RulesForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCompanyLeaveRules()
      .then((loadedRules) => {
        if (!cancelled) setRules(loadedRules)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'Could not load company rules.',
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !rules ||
      typeof rules.minNoticeDays !== 'number' ||
      !Number.isInteger(rules.minNoticeDays) ||
      rules.minNoticeDays < 0 ||
      typeof rules.escalateAfterHours !== 'number' ||
      !Number.isInteger(rules.escalateAfterHours * 4) ||
      rules.escalateAfterHours < 0 ||
      typeof rules.autoApproveAfterHours !== 'number' ||
      !Number.isInteger(rules.autoApproveAfterHours * 4) ||
      rules.autoApproveAfterHours < 0 ||
      (rules.escalateAfterHours > 0 &&
        rules.autoApproveAfterHours > 0 &&
        rules.autoApproveAfterHours < rules.escalateAfterHours)
    ) {
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await saveCompanyLeaveRules({
        ...rules,
        minNoticeDays: rules.minNoticeDays,
        escalateAfterHours: rules.escalateAfterHours,
        autoApproveAfterHours: rules.autoApproveAfterHours,
      })
      setRules(updated)
      setSaved(true)
    } catch (error: unknown) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'Could not save company rules.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Company rules" eyebrow="Company admin">
      <p className="text-muted">
        Set who reviews leave requests, the minimum notice, and timeout rules.
      </p>
      <Alert tone="info">
        Pending requests can be escalated to another same-company manager and
        automatically approved after the configured timeouts. A company
        admin’s request with no eligible reviewer is still approved
        immediately.
      </Alert>
      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {saveError ? <Alert tone="error">{saveError}</Alert> : null}
      {saved ? <Alert tone="success">Company rules saved.</Alert> : null}
      {loading ? <p className="muted">Loading company rules…</p> : null}

      {rules ? (
        <form
          className="flex flex-col gap-stack"
          onSubmit={handleSubmit}
        >
          <Select
            label="Staff leave is reviewed by"
            name="staffReviewer"
            value={rules.staffReviewer}
            disabled={saving}
            onChange={(event) => {
              const next = event.target.value
              if (isStaffReviewer(next)) {
                setRules((current) =>
                  current ? { ...current, staffReviewer: next } : current,
                )
                setSaveError(null)
                setSaved(false)
              }
            }}
          >
            <option value="manager">Department manager</option>
            <option value="company_admin">Company admin</option>
          </Select>
          <Select
            label="A manager’s own leave is reviewed by"
            name="managerReviewer"
            value={rules.managerReviewer}
            disabled={saving}
            onChange={() => {
              setSaveError(null)
              setSaved(false)
            }}
          >
            <option value="company_admin">Company admin</option>
          </Select>
          <TextField
            label="Minimum notice (days)"
            name="minNoticeDays"
            type="number"
            min={0}
            max={2147483647}
            step={1}
            value={rules.minNoticeDays}
            disabled={saving}
            hint="0 means no minimum. Sick and family can still start sooner."
            onChange={(event) => {
              const value = event.target.value
              setRules((current) =>
                current
                  ? {
                      ...current,
                      minNoticeDays: value === '' ? '' : Number(value),
                    }
                  : current,
              )
              setSaveError(null)
              setSaved(false)
            }}
          />
          <TextField
            label="Escalate after (hours)"
            name="escalateAfterHours"
            type="number"
            min={0}
            max={87600}
            step={0.25}
            value={rules.escalateAfterHours}
            disabled={saving}
            hint="0 turns escalation off. Use quarter-hour increments."
            onChange={(event) => {
              const value = event.target.value
              setRules((current) =>
                current
                  ? {
                      ...current,
                      escalateAfterHours: value === '' ? '' : Number(value),
                    }
                  : current,
              )
              setSaveError(null)
              setSaved(false)
            }}
          />
          <TextField
            label="Auto-approve after (hours)"
            name="autoApproveAfterHours"
            type="number"
            min={0}
            max={87600}
            step={0.25}
            value={rules.autoApproveAfterHours}
            disabled={saving}
            hint="0 turns automatic approval off. When both timeouts are on, this must be at least the escalation timeout."
            onChange={(event) => {
              const value = event.target.value
              setRules((current) =>
                current
                  ? {
                      ...current,
                      autoApproveAfterHours:
                        value === '' ? '' : Number(value),
                    }
                  : current,
              )
              setSaveError(null)
              setSaved(false)
            }}
          />
          <Button
            variant="primary"
            type="submit"
            disabled={
              loading ||
              saving ||
              loadError !== null ||
              typeof rules.minNoticeDays !== 'number' ||
              !Number.isInteger(rules.minNoticeDays) ||
              rules.minNoticeDays < 0 ||
              typeof rules.escalateAfterHours !== 'number' ||
              !Number.isInteger(rules.escalateAfterHours * 4) ||
              rules.escalateAfterHours < 0 ||
              typeof rules.autoApproveAfterHours !== 'number' ||
              !Number.isInteger(rules.autoApproveAfterHours * 4) ||
              rules.autoApproveAfterHours < 0 ||
              (rules.escalateAfterHours > 0 &&
                rules.autoApproveAfterHours > 0 &&
                rules.autoApproveAfterHours < rules.escalateAfterHours)
            }
          >
            {saving ? 'Saving…' : 'Save rules'}
          </Button>
        </form>
      ) : null}
    </PageShell>
  )
}
