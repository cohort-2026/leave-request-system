import { apiRequest } from '../../services/api'
import type { LeaveRequestSummary } from '../../shared/components'

export type HomeBalance = {
  leaveType: string
  daysRemaining: number
  daysUsed: number
}

export type HomeRecentRequest = Omit<LeaveRequestSummary, 'id'> & {
  id: string | number
}

export type HomeSummary = {
  balances: HomeBalance[]
  pendingCount: number
  recent: HomeRecentRequest[]
}

export async function getHomeSummary(): Promise<HomeSummary> {
  return apiRequest<HomeSummary>('/api/home')
}