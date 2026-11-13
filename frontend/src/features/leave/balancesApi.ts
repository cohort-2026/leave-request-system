import { apiRequest } from '../../services/api'

export type LeaveBalance = {
  leaveTypeId: number | null
  leaveType: string
  totalAllowance: number
  usedDays: number
  daysRemaining: number
}

type LeaveBalancesResponse = {
  balances: LeaveBalance[]
}

type BalancePayload = Partial<LeaveBalance> & {
  id?: number
  leave_type_id?: number
  total?: number
  used?: number
  remainingDays?: number
  remaining?: number
}

function asPositiveId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function mapBalance(row: BalancePayload): LeaveBalance {
  return {
    leaveTypeId: asPositiveId(row.leaveTypeId ?? row.id ?? row.leave_type_id),
    leaveType: String(row.leaveType ?? '').trim(),
    totalAllowance: Number(row.totalAllowance ?? row.total ?? 0),
    usedDays: Number(row.usedDays ?? row.used ?? 0),
    daysRemaining:
      Number(row.daysRemaining ?? row.remainingDays ?? row.remaining ?? 0),
  }
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const body = await apiRequest<LeaveBalance[] | LeaveBalancesResponse>(
    '/api/leave/balances',
  )
  const list = Array.isArray(body) ? body : body.balances ?? []
  return list.map(mapBalance).filter((row) => row.leaveType.length > 0)
}
