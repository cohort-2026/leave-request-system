import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Select } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError, apiRequest } from '../../../services/api'
import { roleLabel } from '../../../shared/types/session'
import {
  listDepartments,
  updateUserDepartment,
  type Department,
} from '../departmentsApi'
import {
  ASSIGNABLE_ROLES,
  getCompanyUser,
  isAssignableRole,
  updateUserRole,
  type AssignableRole,
  type PublicUser,
} from './usersApi'

type PersonBalance = {
  leaveType: string
  entitledDays: number
  takenDays: number
  pendingDays: number | null
  availableDays: number
}

type BalancePayload = {
  leaveType?: unknown
  totalAllowance?: unknown
  entitledDays?: unknown
  entitled?: unknown
  total?: unknown
  usedDays?: unknown
  takenDays?: unknown
  taken?: unknown
  pendingDays?: unknown
  daysPending?: unknown
  pending?: unknown
  daysRemaining?: unknown
  availableDays?: unknown
  available?: unknown
  remainingDays?: unknown
  remaining?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredBalanceNumber(label: string, ...values: unknown[]): number {
  const value = values.find(
    (candidate) => candidate !== undefined && candidate !== null,
  )
  if (value === undefined || (typeof value === 'string' && !value.trim())) {
    throw new Error(`Balance response is missing ${label}.`)
  }

  const number = Number(value)
  if (!Number.isFinite(number)) {
    throw new Error(`Balance response has an invalid ${label}.`)
  }
  return number
}

function mapPersonBalance(value: unknown): PersonBalance {
  if (!isRecord(value)) {
    throw new Error('Balance response contains an invalid row.')
  }

  const row = value as BalancePayload
  const leaveType = typeof row.leaveType === 'string' ? row.leaveType.trim() : ''
  if (!leaveType) throw new Error('Balance response is missing a leave type.')

  const pendingValue = row.pendingDays ?? row.daysPending ?? row.pending
  return {
    leaveType,
    entitledDays: requiredBalanceNumber(
      'entitlement',
      row.totalAllowance,
      row.entitledDays,
      row.entitled,
      row.total,
    ),
    takenDays: requiredBalanceNumber(
      'taken days',
      row.usedDays,
      row.takenDays,
      row.taken,
    ),
    pendingDays:
      pendingValue === undefined || pendingValue === null
        ? null
        : requiredBalanceNumber('pending days', pendingValue),
    availableDays: requiredBalanceNumber(
      'available days',
      row.daysRemaining,
      row.availableDays,
      row.available,
      row.remainingDays,
      row.remaining,
    ),
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function formatDays(days: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    days,
  )
}

function parseUserId(value: string | undefined): number | null {
  if (!value) return null
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export function UserDetailPage() {
  const { id: rawId } = useParams()
  const id = parseUserId(rawId)

  const [person, setPerson] = useState<PublicUser | null>(null)
  const [balanceResult, setBalanceResult] = useState<{
    userId: number
    balances: PersonBalance[]
    error: string | null
  } | null>(null)
  const balances = balanceResult?.userId === id ? balanceResult.balances : []
  const balancesLoading = id !== null && balanceResult?.userId !== id
  const balancesError =
    balanceResult?.userId === id ? balanceResult.error : null
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('staff')
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [departmentLoadError, setDepartmentLoadError] = useState<string | null>(
    null,
  )
  const [departmentSaveError, setDepartmentSaveError] = useState<string | null>(
    null,
  )
  const [departmentSaved, setDepartmentSaved] = useState(false)
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [savingDepartment, setSavingDepartment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    listDepartments()
      .then((loadedDepartments) => {
        if (!cancelled) setDepartments(loadedDepartments)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDepartmentLoadError(
            err instanceof ApiError
              ? err.message
              : 'Could not load departments.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (id === null) return

    let cancelled = false
    apiRequest<unknown>(`/api/users/${id}/balances`)
      .then((body) => {
        const rows = Array.isArray(body)
          ? body
          : isRecord(body) && Array.isArray(body.balances)
            ? body.balances
            : null
        if (!rows) throw new Error('Unexpected balance response.')
        const loadedBalances = rows.map(mapPersonBalance)
        if (!cancelled) {
          setBalanceResult({
            userId: id,
            balances: loadedBalances,
            error: null,
          })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setBalanceResult({
          userId: id,
          balances: [],
          error:
            err instanceof ApiError
              ? err.message
              : 'Could not load this person’s leave balances.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (id === null) {
      setLoading(false)
      setLoadError('Invalid user id')
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPerson(null)
    setSaved(false)
    setSaveError(null)
    setDepartmentSaveError(null)
    setDepartmentSaved(false)

    getCompanyUser(id)
      .then((user) => {
        if (cancelled) return
        setPerson(user)
        setSelectedDepartmentId(
          user.departmentId === null ? '' : String(user.departmentId),
        )
        if (isAssignableRole(user.role)) {
          setSelectedRole(user.role)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : 'Could not load this person.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (id === null || !person || selectedRole === person.role) return

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await updateUserRole(id, selectedRole)
      setPerson(updated)
      if (isAssignableRole(updated.role)) {
        setSelectedRole(updated.role)
      }
      setSaved(true)
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Could not change the role.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDepartmentSubmit(event: FormEvent) {
    event.preventDefault()
    if (id === null || !person) return

    const departmentId = selectedDepartmentId
      ? Number(selectedDepartmentId)
      : null
    if (departmentId === person.departmentId) return

    setSavingDepartment(true)
    setDepartmentSaveError(null)
    setDepartmentSaved(false)
    try {
      const updated = await updateUserDepartment(id, departmentId)
      setPerson(updated)
      setSelectedDepartmentId(
        updated.departmentId === null ? '' : String(updated.departmentId),
      )
      setDepartmentSaved(true)
    } catch (err: unknown) {
      setDepartmentSaveError(
        err instanceof ApiError
          ? err.message
          : 'Could not change the department.',
      )
    } finally {
      setSavingDepartment(false)
    }
  }

  return (
    <PageShell
      title="Person details"
      eyebrow="Company admin"
      action={
        <Button asChild variant="outline">
          <Link to={paths.adminUsers}>Back to people</Link>
        </Button>
      }
    >
      {loading ? <p className="muted">Loading…</p> : null}
      {loadError ? <Alert tone="error">{loadError}</Alert> : null}

      {person ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 pt-4">
              <Avatar size="lg" aria-hidden="true">
                <AvatarFallback>{getInitials(person.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="m-0 text-xl font-semibold tracking-tight">
                  {person.displayName}
                </h2>
                {person.email ? (
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {person.email}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {roleLabel[person.role] ?? person.role}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {person.status.replaceAll('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="person-balances-heading">
            <div className="mb-3">
              <h2
                id="person-balances-heading"
                className="m-0 text-lg font-semibold"
              >
                Leave balances
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entitlement, leave taken, pending requests, and available days.
              </p>
            </div>
            {balancesLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading leave balances…
              </p>
            ) : null}
            {balancesError ? <Alert tone="error">{balancesError}</Alert> : null}
            {!balancesLoading && !balancesError ? (
              balances.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    No leave balances yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {balances.map((balance) => {
                    const usedPercent =
                      balance.entitledDays > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              (balance.takenDays / balance.entitledDays) * 100,
                            ),
                          )
                        : 0

                    return (
                      <Card key={balance.leaveType}>
                        <CardHeader>
                          <CardTitle>{balance.leaveType}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <BalanceMetric
                            label="Entitled"
                            value={formatDays(balance.entitledDays)}
                          />
                          <BalanceMetric
                            label="Taken"
                            value={formatDays(balance.takenDays)}
                          />
                          <BalanceMetric
                            label="Pending"
                            value={
                              balance.pendingDays === null
                                ? 'Not reported'
                                : formatDays(balance.pendingDays)
                            }
                            detail={
                              balance.pendingDays === null
                                ? 'Not included in response'
                                : undefined
                            }
                          />
                          <BalanceMetric
                            label="Available"
                            value={formatDays(balance.availableDays)}
                          />
                          <div className="col-span-2 space-y-2 pt-1">
                            <Progress
                              value={usedPercent}
                              aria-label={`${balance.leaveType} entitlement used`}
                            />
                            <p className="m-0 text-xs text-muted-foreground">
                              {formatDays(usedPercent)}% of entitlement taken
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            ) : null}
          </section>

          <section
            aria-labelledby="person-settings-heading"
            className="grid gap-4 lg:grid-cols-2"
          >
            <h2 id="person-settings-heading" className="sr-only">
              Person settings
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>Role</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <Select
                    label="Company role"
                    name="role"
                    id="person-role"
                    value={selectedRole}
                    disabled={saving}
                    onChange={(event) => {
                      const next = event.target.value
                      if (isAssignableRole(next)) {
                        setSelectedRole(next)
                        setSaved(false)
                        setSaveError(null)
                      }
                    }}
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel[role]}
                      </option>
                    ))}
                  </Select>

                  <Button
                    type="submit"
                    className="w-fit"
                    disabled={saving || selectedRole === person.role}
                  >
                    {saving ? 'Saving…' : 'Save role'}
                  </Button>

                  {saveError ? <Alert tone="error">{saveError}</Alert> : null}
                  {saved ? <Alert tone="success">Role updated.</Alert> : null}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex flex-col gap-4"
                  onSubmit={handleDepartmentSubmit}
                >
                  {departmentLoadError ? (
                    <Alert tone="error">{departmentLoadError}</Alert>
                  ) : null}
                  <Select
                    label="Department"
                    name="department"
                    id="person-department"
                    value={selectedDepartmentId}
                    disabled={departmentsLoading || savingDepartment}
                    onChange={(event) => {
                      setSelectedDepartmentId(event.target.value)
                      setDepartmentSaved(false)
                      setDepartmentSaveError(null)
                    }}
                  >
                    <option value="">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-fit"
                    disabled={
                      departmentsLoading ||
                      savingDepartment ||
                      departmentLoadError !== null ||
                      (selectedDepartmentId
                        ? Number(selectedDepartmentId)
                        : null) === person.departmentId
                    }
                  >
                    {savingDepartment ? 'Saving…' : 'Save department'}
                  </Button>
                  {departmentSaveError ? (
                    <Alert tone="error">{departmentSaveError}</Alert>
                  ) : null}
                  {departmentSaved ? (
                    <Alert tone="success">Department updated.</Alert>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </PageShell>
  )
}

function BalanceMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div>
      <p className="m-0 text-xs text-muted-foreground">{label}</p>
      <p className="m-0 mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {detail ? (
        <p className="m-0 mt-0.5 text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  )
}
