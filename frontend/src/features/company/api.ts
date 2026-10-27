import { apiRequest } from '../../services/api'

export type SsoSettings = {
  issuer: string
  clientId: string
  emailDomain: string
  enabled: boolean
  clientSecretConfigured: boolean
}

export type SaveSsoSettings = Omit<SsoSettings, 'clientSecretConfigured'> & {
  clientSecret?: string
}

export function getSsoSettings() {
  return apiRequest<SsoSettings>('/api/companies/current/sso')
}

export function saveSsoSettings(settings: SaveSsoSettings) {
  return apiRequest<SsoSettings>('/api/companies/current/sso', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}