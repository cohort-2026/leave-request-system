import type { Session } from '../../shared/types/session'
import { apiRequest } from '../../services/api'

type ServerUser = {
  displayName?: string
  name?: string
  role: Session['role']
  status?: Session['status']
  companyName?: string | null
}

type SessionResponse =
  | ServerUser
  | { session: ServerUser }
  | { user: ServerUser }

function getUser(response: SessionResponse): ServerUser {
  if ('session' in response) return response.session
  if ('user' in response) return response.user
  return response
}

function mapSession(response: SessionResponse): Session {
  const user = getUser(response)

  return {
    displayName: user.displayName ?? user.name ?? '',
    role: user.role,
    status: user.status ?? 'active',
    companyName: user.companyName ?? null,
  }
}

export function getMe() {
  return apiRequest<SessionResponse>('/api/auth/me').then(mapSession)
}

export function login(email: string, password: string) {
  return apiRequest<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(mapSession)
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
