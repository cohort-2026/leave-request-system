import { apiRequest } from '../../services/api'

export type CompanyLeaveType = {
  id: number
  name: string
  defaultDays: number
  allowancePeriod: string
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | null
}

export type LeaveTypeInput = {
  name: string
  defaultDays: number
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | null
}

type LeaveTypesResponse = {
  leaveTypes: CompanyLeaveType[]
}

type LeaveTypeResponse = {
  leaveType: CompanyLeaveType
}

export async function getCompanyLeaveTypes(): Promise<CompanyLeaveType[]> {
  const response = await apiRequest<LeaveTypesResponse>(
    '/api/admin/leave-types',
  )
  return response.leaveTypes
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
  return response.leaveType
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
  return response.leaveType
}
