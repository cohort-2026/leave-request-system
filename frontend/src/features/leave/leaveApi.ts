import { apiRequest } from '../../services/api'
import type { RequestStatus } from '../../shared/components/StatusBadge'

export interface TeamQueueItem {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  leaveType: string;
  status: RequestStatus;
}

export const fetchTeamQueue = async (): Promise<TeamQueueItem[]> => {
  return apiRequest<TeamQueueItem[]>('/api/team/queue')
};

export const fetchTeamQueueDetail = async (id: string): Promise<TeamQueueItem> => {
  return apiRequest<TeamQueueItem>(`/api/leave/${id}`)
};

export const approveTeamRequest = async (id: string): Promise<void> => {
  return apiRequest<void>(`/api/leave/${id}/approve`, { method: 'POST' })
};

export const rejectTeamRequest = async (id: string, reason: string): Promise<void> => {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error('A rejection reason is required');

  return apiRequest<void>(`/api/leave/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ decisionReason: trimmedReason }),
  });
};