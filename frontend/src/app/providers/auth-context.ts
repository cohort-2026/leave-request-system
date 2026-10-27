import { createContext } from 'react'
import type { Role, Session } from '../../shared/types/session'

export type AuthContextValue = {
  session: Session | null
  loading: boolean
  stagingPreview: boolean
  signIn: (session: Session) => void
  signOut: () => Promise<void>
  switchRole: (role: Role) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
