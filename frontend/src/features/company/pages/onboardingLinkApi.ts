import { apiRequest } from '../../../services/api'

export type OnboardingLinkStatus = {
  active: boolean
  createdAt: string | null
}

export type CreatedOnboardingLink = {
  active: true
  url: string
  createdAt: string
}

export function getOnboardingLink() {
  return apiRequest<OnboardingLinkStatus>(
    '/api/companies/current/onboarding-link',
  )
}

export function createOnboardingLink() {
  return apiRequest<CreatedOnboardingLink>(
    '/api/companies/current/onboarding-link',
    { method: 'POST' },
  )
}

export function disableOnboardingLink() {
  return apiRequest<{ ok: true; active: false }>(
    '/api/companies/current/onboarding-link/disable',
    { method: 'POST' },
  )
}
