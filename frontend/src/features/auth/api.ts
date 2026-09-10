import type { Session } from '../../shared/types/session'
import { apiRequest } from '../../shared/utils/api'

type SessionResponse = Session | { session: Session } | { user: Session }

function getSession(response: SessionResponse): Session {
  if ('session' in response) return response.session
  if ('user' in response) return response.user
  return response
}

export function login(email: string, password: string) {
  return apiRequest<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(getSession)
}

export function register(email: string, password: string) {
  return apiRequest<void>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}
