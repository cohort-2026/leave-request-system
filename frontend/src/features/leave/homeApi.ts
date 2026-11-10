import { apiRequest } from '../../services/api'
import type { LeaveBalance } from './balancesApi'
import type { LeaveRequestSummary } from '../../shared/components'

export type HomeRecentRequest = Omit<LeaveRequestSummary, 'id'> & {
  id: string | number
}

export type HomeSummary = {
  balances: LeaveBalance[]
  pendingCount: number
  recent: HomeRecentRequest[]
}

export async function getHomeSummary(): Promise<HomeSummary> {
  return apiRequest<HomeSummary>('/api/home')
}