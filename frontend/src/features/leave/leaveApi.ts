import { ApiError, apiRequest } from '../../services/api'
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

export type DayPart = 'full' | 'morning' | 'afternoon'

export type LeavePreviewHoliday = {
  date: string
  label?: string
  name?: string
}

export type LeavePreviewResponse = {
  workingDaysCount: number
  excludedDates?: string[]
  holidays?: LeavePreviewHoliday[]
  approverName?: string | null
  reviewerName?: string | null
  documentRequired?: boolean
  documentRule?: string | null
  noticeWarning?: string | null
  noticeWarnings?: string[]
}

export type LeaveRequestInput = {
  leaveTypeId: number
  start: string
  end: string
  startPart?: DayPart
  endPart?: DayPart
  reason: string
  file?: File
  removeFile?: boolean
}

export type SubmittedLeaveRequest = {
  id: string
}

type LeaveSubmitResponse = {
  leaveRequest?: { id?: number | string }
  id?: number | string
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
  parts?: { startPart?: DayPart; endPart?: DayPart },
): Promise<LeavePreviewResponse> {
  const params = new URLSearchParams({
    leaveTypeId: String(leaveTypeId),
    start,
    end,
  })
  if (parts?.startPart && parts.startPart !== 'full') {
    params.set('startPart', parts.startPart)
  }
  if (parts?.endPart && parts.endPart !== 'full') {
    params.set('endPart', parts.endPart)
  }

  return apiRequest<LeavePreviewResponse>(`/api/leave/preview?${params}`, {
    signal,
  })
}

function submittedLeaveId(body: LeaveSubmitResponse | MyLeaveRequest): string | null {
  if ('id' in body && body.id != null && body.id !== '') {
    return String(body.id)
  }
  const nested = 'leaveRequest' in body ? body.leaveRequest?.id : undefined
  return nested == null ? null : String(nested)
}

export async function submitLeaveRequest(
  input: LeaveRequestInput,
): Promise<SubmittedLeaveRequest> {
  const body = await apiRequest<LeaveSubmitResponse>('/api/leave', {
    method: 'POST',
    body: leaveRequestForm(input),
  })
  const id = submittedLeaveId(body)
  if (!id) {
    throw new Error('Leave request was saved without an id.')
  }
  return { id }
}

function leaveRequestForm(input: LeaveRequestInput): FormData {
  const body = new FormData()
  body.set('leaveTypeId', String(input.leaveTypeId))
  body.set('start', input.start)
  body.set('end', input.end)
  body.set('reason', input.reason)
  if (input.startPart) body.set('startPart', input.startPart)
  if (input.endPart) body.set('endPart', input.endPart)
  if (input.file) body.set('file', input.file)
  if (input.removeFile) body.set('removeFile', 'true')
  return body
}

export function updateLeaveRequest(
  id: string,
  input: LeaveRequestInput,
): Promise<MyLeaveRequest> {
  return apiRequest<MyLeaveRequest>(`/api/leave/${id}`, {
    method: 'PATCH',
    body: leaveRequestForm(input),
  })
}

export function fetchMyLeaveRequests(): Promise<MyLeaveRequest[]> {
  return apiRequest<MyLeaveRequest[]>('/api/leave')
}

export function fetchMyLeaveRequest(id: string): Promise<MyLeaveRequest> {
  return apiRequest<MyLeaveRequest>(`/api/leave/${id}`)
}

export async function downloadSupportingFile(
  id: string,
  filename: string,
): Promise<void> {
  const response = await fetch(`/api/leave/${id}/file`, {
    credentials: 'include',
  })
  if (!response.ok) {
    let message = 'Could not download the supporting file.'
    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body.error === 'string') message = body.error
    } catch {
      // Keep the fallback message.
    }
    throw new ApiError(message, response.status)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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
  supportingFileName?: string | null
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
