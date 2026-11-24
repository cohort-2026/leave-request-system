import { useEffect, useState, type FormEvent } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { ApiError } from '../../../services/api'
import { Alert } from '../../../shared/components'
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

function isValidRules(rules: RulesForm): rules is CompanyLeaveRules {
  return (
    typeof rules.minNoticeDays === 'number' &&
    Number.isInteger(rules.minNoticeDays) &&
    rules.minNoticeDays >= 0 &&
    typeof rules.escalateAfterHours === 'number' &&
    Number.isInteger(rules.escalateAfterHours * 4) &&
    rules.escalateAfterHours >= 0 &&
    typeof rules.autoApproveAfterHours === 'number' &&
    Number.isInteger(rules.autoApproveAfterHours * 4) &&
    rules.autoApproveAfterHours >= 0 &&
    !(
      rules.escalateAfterHours > 0 &&
      rules.autoApproveAfterHours > 0 &&
      rules.autoApproveAfterHours < rules.escalateAfterHours
    )
  )
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

  function updateRules(patch: Partial<RulesForm>) {
    setRules((current) => (current ? { ...current, ...patch } : current))
    setSaveError(null)
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rules || !isValidRules(rules)) return

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await saveCompanyLeaveRules({
        ...rules,
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

  const canSave =
    rules !== null &&
    isValidRules(rules) &&
    !loading &&
    !saving &&
    loadError === null

  return (
    <PageShell title="Company rules" eyebrow="Company admin">
      <div className="max-w-3xl space-y-4">
        <p className="text-muted-foreground">
          Set who reviews leave requests, the minimum notice, and timeout rules.
        </p>

        {loadError ? <Alert tone="error">{loadError}</Alert> : null}
        {saveError ? <Alert tone="error">{saveError}</Alert> : null}
        {saved ? <Alert tone="success">Company rules saved.</Alert> : null}
        {loading ? <p className="muted">Loading company rules…</p> : null}

        <Alert tone="info">
          Pending requests can be escalated to another same-company manager and
          automatically approved after the configured timeouts. A company
          admin’s request with no eligible reviewer is still approved
          immediately.
        </Alert>

        {rules ? (
          <form
            className="grid gap-4"
            onSubmit={handleSubmit}
            aria-busy={saving}
          >
            <Card>
              <CardHeader>
                <CardTitle>Approval flow</CardTitle>
                <CardDescription>
                  Choose who reviews staff and manager leave requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="staffReviewer">
                      Staff leave is reviewed by
                    </FieldLabel>
                    <Select
                      value={rules.staffReviewer}
                      disabled={saving}
                      onValueChange={(value) => {
                        if (isStaffReviewer(value)) {
                          updateRules({ staffReviewer: value })
                        }
                      }}
                    >
                      <SelectTrigger id="staffReviewer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">
                          Department manager
                        </SelectItem>
                        <SelectItem value="company_admin">
                          Company admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="managerReviewer">
                      A manager’s own leave is reviewed by
                    </FieldLabel>
                    <Select value={rules.managerReviewer} disabled>
                      <SelectTrigger id="managerReviewer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company_admin">
                          Company admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Manager leave must be reviewed by a company admin.
                    </FieldDescription>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request timing</CardTitle>
                <CardDescription>
                  Set how far ahead staff should submit planned leave.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field className="max-w-sm">
                  <FieldLabel htmlFor="minNoticeDays">
                    Minimum notice (days)
                  </FieldLabel>
                  <Input
                    id="minNoticeDays"
                    name="minNoticeDays"
                    type="number"
                    min={0}
                    max={2147483647}
                    step={1}
                    value={rules.minNoticeDays}
                    disabled={saving}
                    onChange={(event) => {
                      const value = event.target.value
                      updateRules({
                        minNoticeDays: value === '' ? '' : Number(value),
                      })
                    }}
                  />
                  <FieldDescription>
                    0 means no minimum. Sick and family leave can still start
                    sooner.
                  </FieldDescription>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escalation and auto-approval</CardTitle>
                <CardDescription>
                  Configure what happens when a request is waiting for a
                  decision.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="escalateAfterHours">
                      Escalate after (hours)
                    </FieldLabel>
                    <Input
                      id="escalateAfterHours"
                      name="escalateAfterHours"
                      type="number"
                      min={0}
                      max={87600}
                      step={0.25}
                      value={rules.escalateAfterHours}
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value
                        updateRules({
                          escalateAfterHours:
                            value === '' ? '' : Number(value),
                        })
                      }}
                    />
                    <FieldDescription>
                      0 turns escalation off. Use quarter-hour increments.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="autoApproveAfterHours">
                      Auto-approve after (hours)
                    </FieldLabel>
                    <Input
                      id="autoApproveAfterHours"
                      name="autoApproveAfterHours"
                      type="number"
                      min={0}
                      max={87600}
                      step={0.25}
                      value={rules.autoApproveAfterHours}
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value
                        updateRules({
                          autoApproveAfterHours:
                            value === '' ? '' : Number(value),
                        })
                      }}
                    />
                    <FieldDescription>
                      0 turns automatic approval off. When both timeouts are
                      on, this must be at least the escalation timeout.
                    </FieldDescription>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSave}>
                {saving ? 'Saving…' : 'Save rules'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </PageShell>
  )
}
