import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { ApiError } from '../../../services/api'
import { Alert } from '../../../shared/components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  createCompanyLeaveType,
  getCompanyLeaveTypes,
  updateCompanyLeaveType,
  type CompanyLeaveType,
  type LeaveTypeInput,
} from '../leaveTypesApi'

const DEFAULT_COLOUR = '#0f766e'

type LeaveTypeForm = {
  name: string
  color: string
  defaultDays: number | ''
  cycleMonths: number | ''
  hasBalance: boolean
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | ''
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function hasBalance(leaveType: CompanyLeaveType): boolean {
  return (
    leaveType.hasBalance ??
    leaveType.name.trim().toLocaleLowerCase() !== 'unpaid'
  )
}

function cycleMonths(leaveType: CompanyLeaveType): number | null {
  if (leaveType.cycleMonths !== undefined) return leaveType.cycleMonths
  const period = leaveType.allowancePeriod.trim().toLocaleLowerCase()
  if (period === 'annual') return 12
  if (period === 'monthly') return 1
  const parsed = Number(period)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function emptyForm(): LeaveTypeForm {
  return {
    name: '',
    color: DEFAULT_COLOUR,
    defaultDays: 0,
    cycleMonths: 12,
    hasBalance: true,
    isActive: true,
    allowBackdate: false,
    requiresDocumentAfterDays: '',
  }
}

function leaveTypeForm(leaveType: CompanyLeaveType): LeaveTypeForm {
  return {
    name: leaveType.name,
    color: leaveType.color ?? DEFAULT_COLOUR,
    defaultDays: leaveType.defaultDays,
    cycleMonths: cycleMonths(leaveType) ?? '',
    hasBalance: hasBalance(leaveType),
    isActive: leaveType.isActive,
    allowBackdate: leaveType.allowBackdate,
    requiresDocumentAfterDays: leaveType.requiresDocumentAfterDays ?? '',
  }
}

function getDaysLabel(leaveType: CompanyLeaveType): string {
  return hasBalance(leaveType) ? String(leaveType.defaultDays) : 'No limit'
}

function formatCycle(months: number | null): string {
  if (months === null) return '—'
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

function formatDocumentRule(days: number | null): string {
  if (days === null) return 'Not required'
  return `After ${days} ${days === 1 ? 'day' : 'days'}`
}

function validateForm(form: LeaveTypeForm): string | null {
  if (!form.name.trim()) return 'Enter a leave type name.'
  if (form.name.trim().length > 80) {
    return 'Leave type names must be 80 characters or fewer.'
  }
  if (
    form.hasBalance &&
    (form.defaultDays === '' ||
      !Number.isInteger(form.defaultDays) ||
      form.defaultDays < 0)
  ) {
    return 'Enter a non-negative whole number of days.'
  }
  if (
    form.hasBalance &&
    (form.cycleMonths === '' ||
      !Number.isInteger(form.cycleMonths) ||
      form.cycleMonths < 1)
  ) {
    return 'Enter a cycle of at least one month.'
  }
  if (
    form.requiresDocumentAfterDays !== '' &&
    (!Number.isInteger(form.requiresDocumentAfterDays) ||
      form.requiresDocumentAfterDays < 0)
  ) {
    return 'Document days must be a non-negative whole number.'
  }
  if (!/^#[\da-f]{6}$/i.test(form.color)) {
    return 'Choose a valid colour.'
  }
  return null
}

function rowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  onOpen: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onOpen()
  }
}

export function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<CompanyLeaveType[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<LeaveTypeForm | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCompanyLeaveTypes()
      .then((loadedTypes) => {
        if (!cancelled) setLeaveTypes(loadedTypes)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, 'Could not load leave types.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function reloadLeaveTypes() {
    setLoading(true)
    setLoadError(null)
    try {
      setLeaveTypes(await getCompanyLeaveTypes())
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, 'Could not load leave types.'))
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setActionError(null)
    setNotice(null)
  }

  function startEdit(leaveType: CompanyLeaveType) {
    setEditingId(leaveType.id)
    setForm(leaveTypeForm(leaveType))
    setActionError(null)
    setNotice(null)
  }

  function closeForm() {
    if (saving) return
    setForm(null)
    setEditingId(null)
    setActionError(null)
  }

  function updateForm<K extends keyof LeaveTypeForm>(
    key: K,
    value: LeaveTypeForm[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return

    const validationError = validateForm(form)
    if (validationError) {
      setActionError(validationError)
      return
    }

    const input: LeaveTypeInput = {
      name: form.name.trim(),
      color: form.color,
      defaultDays: form.hasBalance ? Number(form.defaultDays) : 0,
      cycleMonths: form.hasBalance ? Number(form.cycleMonths) : null,
      hasBalance: form.hasBalance,
      isActive: form.isActive,
      allowBackdate: form.allowBackdate,
      requiresDocumentAfterDays:
        form.requiresDocumentAfterDays === ''
          ? null
          : form.requiresDocumentAfterDays,
    }

    setSaving(true)
    setActionError(null)
    setNotice(null)
    try {
      const savedType =
        editingId === null
          ? await createCompanyLeaveType(input)
          : await updateCompanyLeaveType(editingId, input)
      setLeaveTypes((current) =>
        [...(current ?? []).filter((item) => item.id !== savedType.id), savedType]
          .sort((a, b) => a.name.localeCompare(b.name)),
      )

      const missingFields = [
        savedType.color === undefined ? 'colour' : null,
        savedType.hasBalance === undefined ? 'has balance' : null,
        savedType.cycleMonths === undefined ? 'cycle' : null,
      ].filter((field): field is string => field !== null)
      setNotice(
        missingFields.length > 0
          ? `Leave type saved. The API has not returned ${missingFields.join(', ')} settings yet; they may not be retained.`
          : editingId === null
            ? 'Leave type added.'
            : 'Leave type saved.',
      )
      setForm(null)
      setEditingId(null)
    } catch (error: unknown) {
      setActionError(
        getErrorMessage(
          error,
          editingId === null
            ? 'Could not add the leave type.'
            : 'Could not save the leave type.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell
      title="Leave types"
      eyebrow="Company admin"
      action={
        <Button
          type="button"
          onClick={startCreate}
          disabled={loading || loadError !== null}
        >
          Add leave type
        </Button>
      }
    >
      <p className="text-muted-foreground">
        Set the rules HR uses when staff request leave. Deactivated types stay
        available in historical records.
      </p>
      {loadError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Alert tone="error">{loadError}</Alert>
          <Button
            type="button"
            variant="outline"
            onClick={() => void reloadLeaveTypes()}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Try again'}
          </Button>
        </div>
      ) : null}
      {actionError && !form ? <Alert tone="error">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading leave types…</p>
      ) : null}
      {!loading && !loadError && leaveTypes ? (
        leaveTypes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <h2 className="m-0 text-base font-semibold">No leave types yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a leave type to define how staff can request time off.
            </p>
            <Button className="mt-2" onClick={startCreate}>
              Add leave type
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave type</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Has balance</TableHead>
                <TableHead>Backdating</TableHead>
                <TableHead>Document rule</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((leaveType) => {
                const hasTypeBalance = hasBalance(leaveType)
                const months = cycleMonths(leaveType)
                const openEditor = () => startEdit(leaveType)

                return (
                  <TableRow
                    key={leaveType.id}
                    tabIndex={0}
                    aria-label={`Edit ${leaveType.name}`}
                    onClick={openEditor}
                    onKeyDown={(event) => rowKeyDown(event, openEditor)}
                    className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <TableCell className="font-medium">
                      {leaveType.name}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {getDaysLabel(leaveType)}
                    </TableCell>
                    <TableCell>{hasTypeBalance ? formatCycle(months) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={hasTypeBalance ? 'secondary' : 'outline'}>
                        {hasTypeBalance ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={leaveType.allowBackdate ? 'secondary' : 'outline'}
                      >
                        {leaveType.allowBackdate ? 'Allowed' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDocumentRule(leaveType.requiresDocumentAfterDays)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={leaveType.isActive ? 'default' : 'outline'}
                      >
                        {leaveType.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )
      ) : null}

      <Sheet
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>
              {editingId === null ? 'Add leave type' : 'Edit leave type'}
            </SheetTitle>
            <SheetDescription>
              Configure the leave type and the rules shown to staff.
            </SheetDescription>
          </SheetHeader>
          {form ? (
            <form
              id="leave-type-form"
              onSubmit={handleSubmit}
              aria-busy={saving}
              className="flex min-h-0 flex-1 flex-col"
            >
              <FieldGroup className="overflow-y-auto px-4 pb-5">
                {actionError ? <Alert tone="error">{actionError}</Alert> : null}
                <Field>
                  <FieldLabel htmlFor="leave-type-name">Name</FieldLabel>
                  <Input
                    id="leave-type-name"
                    name="name"
                    value={form.name}
                    maxLength={80}
                    required
                    disabled={saving}
                    onChange={(event) => {
                      const name = event.target.value
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              name,
                              hasBalance:
                                name.trim().toLocaleLowerCase() === 'unpaid'
                                  ? false
                                  : current.hasBalance,
                            }
                          : current,
                      )
                    }}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="leave-type-colour">Colour</FieldLabel>
                    <div className="flex items-center gap-3">
                      <Input
                        id="leave-type-colour"
                        name="color"
                        type="color"
                        value={form.color}
                        disabled={saving}
                        className="h-10 w-14 cursor-pointer p-1"
                        onChange={(event) =>
                          updateForm('color', event.target.value)
                        }
                      />
                      <span className="font-mono text-xs uppercase text-muted-foreground">
                        {form.color}
                      </span>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="leave-type-days">
                      Days per cycle
                    </FieldLabel>
                    <Input
                      id="leave-type-days"
                      name="defaultDays"
                      type="number"
                      min={0}
                      max={2147483647}
                      step={1}
                      value={form.hasBalance ? form.defaultDays : ''}
                      placeholder={form.hasBalance ? undefined : 'No limit'}
                      required={form.hasBalance}
                      disabled={saving || !form.hasBalance}
                      onChange={(event) => {
                        const value = event.target.value
                        updateForm(
                          'defaultDays',
                          value === '' ? '' : Number(value),
                        )
                      }}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="leave-type-cycle">
                    Cycle length (months)
                  </FieldLabel>
                  <Input
                    id="leave-type-cycle"
                    name="cycleMonths"
                    type="number"
                    min={1}
                    max={1200}
                    step={1}
                    value={form.hasBalance ? form.cycleMonths : ''}
                    placeholder={form.hasBalance ? undefined : 'No cycle'}
                    required={form.hasBalance}
                    disabled={saving || !form.hasBalance}
                    onChange={(event) => {
                      const value = event.target.value
                      updateForm(
                        'cycleMonths',
                        value === '' ? '' : Number(value),
                      )
                    }}
                  />
                  <FieldDescription>
                    For example, 36 months for a three-year entitlement cycle.
                  </FieldDescription>
                </Field>

                {!form.hasBalance ? (
                  <p className="m-0 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    No limit: this leave type does not draw from an allocated
                    balance.
                  </p>
                ) : null}

                <Field
                  orientation="horizontal"
                  className="items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <FieldLabel htmlFor="leave-type-has-balance">
                      Has balance
                    </FieldLabel>
                    <FieldDescription>
                      Turn off for unpaid or unlimited leave.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="leave-type-has-balance"
                    checked={form.hasBalance}
                    disabled={saving}
                    onCheckedChange={(checked) =>
                      updateForm('hasBalance', checked)
                    }
                  />
                </Field>

                <Field
                  orientation="horizontal"
                  className="items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <FieldLabel htmlFor="leave-type-backdate">
                      Allow backdating
                    </FieldLabel>
                    <FieldDescription>
                      Let staff submit leave for dates in the past.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="leave-type-backdate"
                    checked={form.allowBackdate}
                    disabled={saving}
                    onCheckedChange={(checked) =>
                      updateForm('allowBackdate', checked)
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="leave-type-document">
                    Require a document after (days)
                  </FieldLabel>
                  <Input
                    id="leave-type-document"
                    name="requiresDocumentAfterDays"
                    type="number"
                    min={0}
                    max={2147483647}
                    step={1}
                    value={form.requiresDocumentAfterDays}
                    placeholder="Not required"
                    disabled={saving}
                    onChange={(event) => {
                      const value = event.target.value
                      updateForm(
                        'requiresDocumentAfterDays',
                        value === '' ? '' : Number(value),
                      )
                    }}
                  />
                  <FieldDescription>
                    Leave blank when supporting documents are not required.
                  </FieldDescription>
                </Field>

                <Field
                  orientation="horizontal"
                  className="items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <FieldLabel htmlFor="leave-type-active">
                      Active
                    </FieldLabel>
                    <FieldDescription>
                      Inactive types are hidden from new requests but remain in
                      history.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="leave-type-active"
                    checked={form.isActive}
                    disabled={saving}
                    onCheckedChange={(checked) =>
                      updateForm('isActive', checked)
                    }
                  />
                </Field>
              </FieldGroup>
              <SheetFooter className="border-t">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={closeForm}
                >
                  Cancel
                </Button>
                <Button type="submit" form="leave-type-form" disabled={saving}>
                  {saving
                    ? 'Saving…'
                    : editingId === null
                      ? 'Add leave type'
                      : 'Save changes'}
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
