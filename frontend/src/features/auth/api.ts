import type { Session } from '../../shared/types/session'
import { apiRequest } from '../../services/api'

type ServerUser = {
  displayName?: string
  name?: string
  role: Session['role']
  status?: Session['status']
  companyName?: string | null
}

export type TotpEnrollmentChallenge = {
  totpEnrollmentRequired: true
  otpauthUrl: string
  secret: string
  qrSvg: string
  totpReset?: true
}

export type TotpLoginChallenge = {
  totpRequired: true
}

export type LoginResult = TotpEnrollmentChallenge | TotpLoginChallenge

export type EnrollResult = Session & { recoveryCodes: string[] }

function mapSession(user: ServerUser): Session {
  return {
    displayName: user.displayName ?? user.name ?? '',
    role: user.role,
    status: user.status ?? 'active',
    companyName: user.companyName ?? null,
  }
}

export function getMe() {
  return apiRequest<ServerUser>('/api/auth/me').then(mapSession)
}

export function login(email: string, password: string) {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function confirmTotpEnroll(email: string, code: string) {
  return apiRequest<ServerUser & { recoveryCodes?: string[] }>(
    '/api/auth/login/totp/enroll',
    {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    },
  ).then((user) => ({
    ...mapSession(user),
    recoveryCodes: Array.isArray(user.recoveryCodes) ? user.recoveryCodes : [],
  }))
}

export function verifyTotpLogin(email: string, code: string) {
  return apiRequest<ServerUser>('/api/auth/login/totp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }).then(mapSession)
}

export function verifyTotpRecovery(email: string, recoveryCode: string) {
  return apiRequest<TotpEnrollmentChallenge>('/api/auth/login/totp', {
    method: 'POST',
    body: JSON.stringify({ email, recoveryCode }),
  })
}

export function register(email: string, password: string) {
  return apiRequest<void>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}

export function verifyEmail(token: string) {
  return apiRequest<{ ok: true }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function resendVerification(email: string) {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/resend-verification',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  )
}
