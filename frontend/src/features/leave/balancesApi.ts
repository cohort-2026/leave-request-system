import { apiRequest } from '../../services/api'

export type LeaveBalance = {
  leaveType: string
  totalAllowance: number
  usedDays: number
  daysRemaining: number
}

function isLeaveBalance(value: unknown): value is LeaveBalance {
  if (typeof value !== 'object' || value === null) return false
  const balance = value as Record<string, unknown>
  return (
    typeof balance.leaveType === 'string' &&
    balance.leaveType.trim().length > 0 &&
    Number.isInteger(balance.totalAllowance) &&
    Number(balance.totalAllowance) >= 0 &&
    Number.isInteger(balance.usedDays) &&
    Number(balance.usedDays) >= 0 &&
    Number.isInteger(balance.daysRemaining) &&
    Number(balance.daysRemaining) >= 0
  )
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  const body: unknown = await apiRequest<unknown>('/api/leave/balances')
  if (
    typeof body !== 'object' ||
    body === null ||
    !('balances' in body) ||
    !Array.isArray(body.balances) ||
    !body.balances.every(isLeaveBalance)
  ) {
    throw new Error('The leave balances response is invalid.')
  }
  return body.balances
}
