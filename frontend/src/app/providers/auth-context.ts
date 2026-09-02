import { createContext } from 'react'
import type { Session } from '../../shared/types/session'

export type AuthContextValue = {
  session: Session | null
  signIn: (session: Session) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
