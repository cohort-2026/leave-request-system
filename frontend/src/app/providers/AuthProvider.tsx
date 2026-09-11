import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '../../shared/types/session'
import { getMe, logout } from '../../features/auth/api'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
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
      signIn: (next) => {
        setSession(next)
      },
      signOut: async () => {
        try {
          await logout()
        } finally {
          setSession(null)
        }
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
