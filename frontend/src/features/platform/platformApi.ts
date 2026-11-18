import { apiRequest } from '../../services/api'

export type PlatformCompany = {
  id: number
  name: string
  slug: string
  status: string
  subscriptionStatus: string | null
  planName: string | null
  seatLimit: number | null
  seatsUsed: number
}

type PlatformCompaniesResponse = {
  companies: PlatformCompany[]
}

export async function fetchPlatformCompanies(): Promise<PlatformCompany[]> {
  const response = await apiRequest<PlatformCompaniesResponse>(
    '/api/platform/companies',
  )
  return response.companies
}
