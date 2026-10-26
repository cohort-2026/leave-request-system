import type { Session } from '../../shared/types/session'
import { apiRequest } from '../../services/api'

type ServerUser = {
  id?: number
  email?: string
  displayName?: string
  name?: string
  role: Session['role']
  status?: Session['status']
  companyId?: number | null
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
    id: user.id ?? 0,
    email: user.email ?? '',
    displayName: user.displayName ?? user.name ?? user.email ?? '',
    role: user.role,
    status: user.status ?? 'active',
    companyId: user.companyId ?? null,
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

export function onboard(
  token: string,
  email: string,
  password: string,
  displayName: string,
) {
  return apiRequest<ServerUser>('/api/auth/onboard', {
    method: 'POST',
    body: JSON.stringify({ token, email, password, displayName }),
  })
}

export function signupCompany(
  companyName: string,
  displayName: string,
  email: string,
  password: string,
) {
  return apiRequest<{
    id: number
    email: string
    displayName: string
    role: Session['role']
    status: Session['status']
    companyName: string
    company: { id: number; name: string; slug: string; trialEndsAt: string }
  }>('/api/companies/signup', {
    method: 'POST',
    body: JSON.stringify({ companyName, displayName, email, password }),
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

export function forgotPassword(email: string) {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  )
}

export function resetPassword(token: string, password: string) {
  return apiRequest<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function updateMe(displayName: string) {
  return apiRequest<ServerUser>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  }).then(mapSession)
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ ok: true }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function requestTotpReset() {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/totp/reset-request',
    { method: 'POST' },
  )
}

export function confirmTotpReset(token: string) {
  return apiRequest<TotpEnrollmentChallenge | { ok: true; totpReset: true }>(
    '/api/auth/totp/reset-confirm',
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    },
  )
}

export function getTotpEnrollment() {
  return apiRequest<TotpEnrollmentChallenge>('/api/auth/totp/enrollment')
}

export function isTotpEnrollment(
  value: TotpEnrollmentChallenge | { ok: true; totpReset: true },
): value is TotpEnrollmentChallenge {
  return 'totpEnrollmentRequired' in value && value.totpEnrollmentRequired
}

export function confirmSignedInTotpEnroll(code: string) {
  return apiRequest<ServerUser & { recoveryCodes?: string[] }>(
    '/api/auth/totp/enroll',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  ).then((user) => ({
    ...mapSession(user),
    recoveryCodes: Array.isArray(user.recoveryCodes) ? user.recoveryCodes : [],
  }))
}
