import { apiRequest } from '../../services/api'

export const DEFAULT_BRAND_PRIMARY = '#059669'
export const DEFAULT_BRAND_ACCENT = '#047857'

export type CompanyBranding = {
  id: number
  name: string
  slug: string
  slogan: string | null
  brandPrimary: string | null
  brandAccent: string | null
  brandColorsManual: boolean
  hasLogo: boolean
  logoUrl: string | null
}

export function getCompanyBranding() {
  return apiRequest<CompanyBranding>('/api/companies/current')
}

export function saveCompanyBranding(input: {
  slogan: string | null
  brandPrimary: string | null
  brandAccent: string | null
  brandColorsManual: boolean
}) {
  return apiRequest<CompanyBranding>('/api/companies/current/branding', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function uploadCompanyLogo(file: File) {
  const body = new FormData()
  body.set('logo', file)
  return apiRequest<CompanyBranding>('/api/companies/current/logo', {
    method: 'POST',
    body,
  })
}

export function removeCompanyLogo() {
  return apiRequest<CompanyBranding>('/api/companies/current/logo', {
    method: 'DELETE',
  })
}
