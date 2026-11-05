import { apiRequest } from '../../services/api'

export type LeaveType = {
  id: number
  name: string
  defaultDays: number
  allowancePeriod: string
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | null
}

type LeaveTypesResponse = {
  leaveTypes: LeaveType[]
}

type LeavePreviewResponse = {
  workingDaysCount: number
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  const response = await apiRequest<LeaveTypesResponse | LeaveType[]>(
    '/api/leave-types',
  )
  return Array.isArray(response) ? response : response.leaveTypes
}

export function previewLeave(
  leaveTypeId: number,
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<LeavePreviewResponse> {
  const params = new URLSearchParams({
    leaveTypeId: String(leaveTypeId),
    start,
    end,
  })

  return apiRequest<LeavePreviewResponse>(`/api/leave/preview?${params}`, {
    signal,
  })
}

export function submitLeaveRequest(input: {
  leaveTypeId: number
  start: string
  end: string
  reason: string
  file?: File
}): Promise<unknown> {
  const body = new FormData()
  body.set('leaveTypeId', String(input.leaveTypeId))
  body.set('start', input.start)
  body.set('end', input.end)
  body.set('reason', input.reason)
  if (input.file) body.set('file', input.file)

  return apiRequest<unknown>('/api/leave', {
    method: 'POST',
    body,
  })
}
