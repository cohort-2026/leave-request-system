import { apiRequest } from '../../services/api'

export type LeaveBalance = {
  leaveType: string
  totalAllowance: number
  usedDays: number
  daysRemaining: number
}

type LeaveBalancesResponse = {
  balances: LeaveBalance[]
}

type BalancePayload = Partial<LeaveBalance> & {
  total?: number
  used?: number
  remainingDays?: number
  remaining?: number
}

function mapBalance(row: BalancePayload): LeaveBalance {
  return {
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
