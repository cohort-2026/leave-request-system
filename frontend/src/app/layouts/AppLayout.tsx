import { Outlet } from 'react-router-dom'
import { Nav } from '../../shared/components'
import { roleLabel } from '../../shared/types/session'
import { useAuth } from '../providers/useAuth'

export function AppLayout() {
  const { session, signOut } = useAuth()

  if (!session) {
    return null
  }

  return (
    <div className="app-shell">
      <aside className="app-side">
        <div>
          <p className="brand">Leave request</p>
          <p className="muted">
            {session.displayName}
            <br />
            {roleLabel[session.role]}
            {session.companyName ? ` · ${session.companyName}` : ''}
          </p>
        </div>
        <Nav role={session.role} />
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
