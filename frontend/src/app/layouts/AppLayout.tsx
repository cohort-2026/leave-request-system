import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Nav } from '../../shared/components'
import { homeFor, paths } from '../../shared/constants/paths'
import { roleLabel, type Role } from '../../shared/types/session'
import { useAuth } from '../providers/useAuth'
import { isStagingRole, STAGING_ROLES } from '../staging'

export function AppLayout({ children }: { children?: ReactNode }) {
  const { session, signOut, stagingPreview, switchRole } = useAuth()
  const navigate = useNavigate()
  const previousRole = useRef<Role | undefined>(undefined)

  useEffect(() => {
    if (!stagingPreview || !session) {
      return
    }
    if (previousRole.current === undefined) {
      previousRole.current = session.role
      return
    }
    if (previousRole.current === session.role) {
      return
    }
    previousRole.current = session.role
    navigate(homeFor(session.role), { replace: true })
  }, [navigate, session, stagingPreview])

  if (!session) {
    return null
  }

  async function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRole = event.target.value
    if (!isStagingRole(nextRole)) {
      return
    }
    await switchRole(nextRole)
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
            {stagingPreview ? (
              <label className="staging-role">
                View as
                <select
                  name="staging-role"
                  value={session.role}
                  onChange={(event) => void handleRoleChange(event)}
                >
                  {STAGING_ROLES.map((role: Role) => (
                    <option key={role} value={role}>
                      {roleLabel[role]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="muted">
                <Link to={paths.profile}>{session.displayName}</Link>
                {` · ${roleLabel[session.role]}`}
              </span>
            )}
            {stagingPreview ? null : (
              <button type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            )}
          </div>
        </header>

        <main className="app-main">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
