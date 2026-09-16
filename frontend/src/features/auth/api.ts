import type { Session } from '../../shared/types/session'
import { apiRequest } from '../../services/api'

type ServerUser = {
  displayName?: string
  name?: string
  role: Session['role']
  status?: Session['status']
  companyName?: string | null
}

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

export type LoginResult =
  | { otpRequired: true }
  | { otpRequired?: false; session: Session }

export function login(email: string, password: string) {
  return apiRequest<ServerUser | { otpRequired: true }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  ).then((data): LoginResult => {
    if ('otpRequired' in data && data.otpRequired) {
      return { otpRequired: true }
    }
    return { session: mapSession(data) }
  })
}

export function verifyLoginOtp(email: string, code: string) {
  return apiRequest<ServerUser>('/api/auth/login/otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }).then(mapSession)
}

export function resendLoginOtp(email: string) {
  return apiRequest<{ ok: true; message?: string }>(
    '/api/auth/resend-login-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  )
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
