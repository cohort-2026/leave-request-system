import { apiRequest } from '../../services/api'

export type CompanyLeaveType = {
  id: number
  name: string
  defaultDays: number
  allowancePeriod: string
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | null
  color?: string
  hasBalance?: boolean
  cycleMonths?: number | null
}

export type LeaveTypeInput = {
  name: string
  defaultDays: number
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | null
  color: string
  hasBalance: boolean
  cycleMonths: number | null
}

type LeaveTypesResponse = {
  leaveTypes: LeaveTypeApiRow[]
}

type LeaveTypeResponse = {
  leaveType: LeaveTypeApiRow
}

type LeaveTypeApiRow = CompanyLeaveType & {
  colour?: unknown
  has_balance?: unknown
  cycle_months?: unknown
}

function mapCompanyLeaveType(row: LeaveTypeApiRow): CompanyLeaveType {
  const color =
    typeof row.color === 'string'
      ? row.color
      : typeof row.colour === 'string'
        ? row.colour
        : undefined
  const hasBalanceValue = row.hasBalance ?? row.has_balance
  const cycleMonthsValue = row.cycleMonths ?? row.cycle_months
  const cycleMonths =
    cycleMonthsValue === null
      ? null
      : typeof cycleMonthsValue === 'number' &&
          Number.isInteger(cycleMonthsValue) &&
          cycleMonthsValue > 0
        ? cycleMonthsValue
        : undefined

  return {
    ...row,
    color,
    hasBalance:
      typeof hasBalanceValue === 'boolean' ? hasBalanceValue : undefined,
    cycleMonths,
  }
}

export async function getCompanyLeaveTypes(): Promise<CompanyLeaveType[]> {
  const response = await apiRequest<LeaveTypesResponse>(
    '/api/admin/leave-types',
  )
  return response.leaveTypes.map(mapCompanyLeaveType)
}

export async function createCompanyLeaveType(
  input: LeaveTypeInput,
): Promise<CompanyLeaveType> {
  const response = await apiRequest<LeaveTypeResponse>(
    '/api/admin/leave-types',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return mapCompanyLeaveType(response.leaveType)
}

export async function updateCompanyLeaveType(
  id: number,
  input: LeaveTypeInput,
): Promise<CompanyLeaveType> {
  const response = await apiRequest<LeaveTypeResponse>(
    `/api/admin/leave-types/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
  return mapCompanyLeaveType(response.leaveType)
}
