import { useMemo, useState, type ReactNode } from 'react'
import type { Session } from '../../shared/types/session'
import { AuthContext, type AuthContextValue } from './auth-context'

const storageKey = 'lrs.walkthrough-session'

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: (next) => {
        sessionStorage.setItem(storageKey, JSON.stringify(next))
        setSession(next)
      },
      signOut: () => {
        sessionStorage.removeItem(storageKey)
        setSession(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
