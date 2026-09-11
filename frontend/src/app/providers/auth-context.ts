import { createContext } from 'react'
import type { Session } from '../../shared/types/session'

export type AuthContextValue = {
  session: Session | null
  loading: boolean
  signIn: (session: Session) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
