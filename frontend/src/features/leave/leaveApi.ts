import { apiRequest } from '../../services/api'
import type { RequestStatus } from '../../shared/components/StatusBadge'

export type LeaveType = {
  id: number
  name: string
  defaultDays: number
  allowancePeriod: string
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | null
}

export type MyLeaveRequest = {
  id: string
  employeeName: string
  leaveTypeId: number
  leaveType: string
  startDate: string
  endDate: string
  workingDays: number
  reason: string | null
  supportingFileName: string | null
  status: RequestStatus
  submittedAt: string
  decisionReason: string | null
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
  removeFile?: boolean
}): Promise<unknown> {
  return apiRequest<unknown>('/api/leave', {
    method: 'POST',
    body: leaveRequestForm(input),
  })
}

function leaveRequestForm(input: {
  leaveTypeId: number
  start: string
  end: string
  reason: string
  file?: File
  removeFile?: boolean
}): FormData {
  const body = new FormData()
  body.set('leaveTypeId', String(input.leaveTypeId))
  body.set('start', input.start)
  body.set('end', input.end)
  body.set('reason', input.reason)
  if (input.file) body.set('file', input.file)
  if (input.removeFile) body.set('removeFile', 'true')
  return body
}

export function updateLeaveRequest(
  id: string,
  input: {
    leaveTypeId: number
    start: string
    end: string
    reason: string
    file?: File
    removeFile?: boolean
  },
): Promise<MyLeaveRequest> {
  return apiRequest<MyLeaveRequest>(`/api/leave/${id}`, {
    method: 'PUT',
    body: leaveRequestForm(input),
  })
}

export function fetchMyLeaveRequests(): Promise<MyLeaveRequest[]> {
  return apiRequest<MyLeaveRequest[]>('/api/leave/mine')
}

export function fetchMyLeaveRequest(id: string): Promise<MyLeaveRequest> {
  return apiRequest<MyLeaveRequest>(`/api/leave/${id}`)
}

export function cancelMyLeaveRequest(id: string): Promise<MyLeaveRequest> {
  return apiRequest<MyLeaveRequest>(`/api/leave/${id}/cancel`, {
    method: 'POST',
  })
}

export type TeamQueueItem = {
  id: string
  employeeName: string
  startDate: string
  endDate: string
  workingDays: number
  leaveType: string
  status: RequestStatus
}

export function fetchTeamQueue(): Promise<TeamQueueItem[]> {
  return apiRequest<TeamQueueItem[]>('/api/team/queue')
}

export function fetchTeamQueueDetail(id: string): Promise<TeamQueueItem> {
  return apiRequest<TeamQueueItem>(`/api/leave/${id}`)
}

export function approveTeamRequest(id: string): Promise<void> {
  return apiRequest<void>(`/api/leave/${id}/approve`, { method: 'POST' })
}

export function rejectTeamRequest(id: string, reason: string): Promise<void> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) throw new Error('A rejection reason is required')

  return apiRequest<void>(`/api/leave/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ decisionReason: trimmedReason }),
  })
}
