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

export function login(email: string, password: string) {
  return apiRequest<ServerUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(mapSession)
}

export function register(email: string, password: string) {
  return apiRequest<ServerUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(mapSession)
}

export function verifyEmail(email: string, code: string) {
  return apiRequest<ServerUser>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }).then(mapSession)
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ ok: true }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(email: string, code: string, password: string) {
  return apiRequest<{ ok: true }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, password }),
  })
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}
