import { Link, Outlet } from 'react-router-dom'
import { Nav } from '../../shared/components'
import { paths } from '../../shared/constants/paths'
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
        <p className="brand">Leave request</p>
        <Nav role={session.role} />
      </aside>
      <div className="app-content">
        <header className="app-header">
          <strong>{session.companyName ?? 'Leave request'}</strong>
          <div className="app-header-user">
            <span className="muted">
              <Link to={paths.profile}>{session.displayName}</Link>
              {` · ${roleLabel[session.role]}`}
            </span>
            <button type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
