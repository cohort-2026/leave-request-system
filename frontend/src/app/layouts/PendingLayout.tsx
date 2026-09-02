import { Outlet } from 'react-router-dom'
import { useAuth } from '../providers/useAuth'

export function PendingLayout() {
  const { session, signOut } = useAuth()

  return (
    <div className="public-shell">
      <div className="public-card">
        <p className="brand">Leave request</p>
        {session ? (
          <p className="muted">
            {session.displayName}
            {session.companyName ? ` · ${session.companyName}` : ''}
          </p>
        ) : null}
        <Outlet />
        <p>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
