import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, Session } from '../../shared/types/session'
import { assumeStagingRole, getMe, logout } from '../../features/auth/api'
import { AuthContext, type AuthContextValue } from './auth-context'
import {
  mockStagingSession,
  readStagingRole,
  STAGING_AUTH_BYPASS,
  writeStagingRole,
} from '../staging'

async function loadStagingSession(role: Role): Promise<Session> {
  try {
    return await assumeStagingRole(role)
  } catch {
    return mockStagingSession(role)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      if (STAGING_AUTH_BYPASS) {
        const role = readStagingRole()
        setSession(await loadStagingSession(role))
        setLoading(false)
        return
      }

      try {
        const currentSession = await getMe()
        setSession(currentSession)
      } catch {
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    void loadSession()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      stagingPreview: STAGING_AUTH_BYPASS,
      signIn: (next) => {
        setSession(next)
      },
      signOut: async () => {
        if (STAGING_AUTH_BYPASS) {
          return
        }
        try {
          await logout()
        } finally {
          setSession(null)
        }
      },
      switchRole: async (role) => {
        writeStagingRole(role)
        setSession(await loadStagingSession(role))
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
