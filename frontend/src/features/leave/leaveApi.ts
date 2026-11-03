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
  const response = await fetch('/api/team/queue');
  if (!response.ok) throw new Error('Failed to fetch team queue');
  return response.json();
};

export const fetchTeamQueueDetail = async (id: string): Promise<TeamQueueItem> => {
  const response = await fetch(`/api/team/queue/${id}`);
  if (!response.ok) throw new Error('Failed to fetch leave request details');
  return response.json();
};

export const approveTeamRequest = async (id: string): Promise<void> => {
  const response = await fetch(`/api/team/queue/${id}/approve`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to approve request');
};

export const rejectTeamRequest = async (id: string, reason: string): Promise<void> => {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error('A rejection reason is required');

  const response = await fetch(`/api/team/queue/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: trimmedReason }),
  });
  if (!response.ok) throw new Error('Failed to reject request');
};