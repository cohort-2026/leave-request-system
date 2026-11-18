import { apiRequest } from '../../services/api'

export type LeaveBalance = {
  leaveTypeId: number | null
  leaveType: string
  entitled: number
  taken: number
  pending: number
  available: number | null
  hasBalance: boolean
  cycleLabel: string | null
  /** @deprecated alias of entitled */
  totalAllowance: number
  /** @deprecated alias of taken */
  usedDays: number
  /** @deprecated alias of available; 0 when unlimited */
  daysRemaining: number
  pendingDays: number
}

type LeaveBalancesResponse = {
  balances: LeaveBalance[]
}

type BalancePayload = {
  leaveTypeId?: unknown
  id?: unknown
  leave_type_id?: unknown
  leaveType?: unknown
  entitled?: unknown
  totalAllowance?: unknown
  total?: unknown
  taken?: unknown
  usedDays?: unknown
  used?: unknown
  pending?: unknown
  pendingDays?: unknown
  pending_days?: unknown
  reservedDays?: unknown
  available?: unknown
  daysRemaining?: unknown
  remainingDays?: unknown
  remaining?: unknown
  hasBalance?: unknown
  has_balance?: unknown
  cycleLabel?: unknown
  cycle_label?: unknown
}

function asDays(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === '') return fallback
  const days = Number(value)
  return Number.isFinite(days) ? days : fallback
}

function asOptionalDays(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const days = Number(value)
  return Number.isFinite(days) ? days : null
}

function asPositiveId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function asOptionalLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const label = value.trim()
  return label.length > 0 ? label : null
}

export function mapLeaveBalance(
  row: BalancePayload | Record<string, unknown>,
): LeaveBalance {
  const leaveType = String(row.leaveType ?? '').trim()
  const entitled = asDays(row.entitled ?? row.totalAllowance ?? row.total)
  const taken = asDays(row.taken ?? row.usedDays ?? row.used)
  const pending = asDays(
    row.pending ?? row.pendingDays ?? row.pending_days ?? row.reservedDays,
  )
  const hasBalanceFlag = row.hasBalance ?? row.has_balance
  const availableRaw = asOptionalDays(row.available)
  const hasBalance =
    typeof hasBalanceFlag === 'boolean'
      ? hasBalanceFlag
      : availableRaw !== null
  const available = hasBalance
    ? (typeof availableRaw === 'number'
        ? availableRaw
        : asDays(row.daysRemaining ?? row.remainingDays ?? row.remaining))
    : null

  return {
    leaveTypeId: asPositiveId(row.leaveTypeId ?? row.id ?? row.leave_type_id),
    leaveType,
    entitled,
    taken,
    pending,
    available,
    hasBalance,
    cycleLabel: asOptionalLabel(row.cycleLabel ?? row.cycle_label),
    totalAllowance: entitled,
    usedDays: taken,
    daysRemaining: available ?? 0,
    pendingDays: pending,
  }
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const body = await apiRequest<LeaveBalance[] | LeaveBalancesResponse>(
    '/api/leave/balances',
  )
  const list = Array.isArray(body) ? body : body.balances ?? []
  return list.map(mapLeaveBalance).filter((row) => row.leaveType.length > 0)
}
