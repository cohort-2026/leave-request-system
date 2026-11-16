import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homeFor, paths } from '../../shared/constants/paths'
import type { Role } from '../../shared/types/session'
import { useAuth } from '../providers/useAuth'

export function GuestOnly() {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  if (session?.status === 'pending_verification') {
    return <Navigate to={paths.verify} replace />
  }
  if (session?.status === 'active') {
    return <Navigate to={homeFor(session.role)} replace />
  }

  return <Outlet />
}

export function SessionGate() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (!session) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />
  }

  const path = location.pathname

  if (path === paths.forbidden) {
    return <Outlet />
  }

  if (session.status === 'pending_verification' && path !== paths.verify) {
    return <Navigate to={paths.verify} replace />
  }

  if (
    session.status === 'active' &&
    path === paths.verify
  ) {
    return <Navigate to={homeFor(session.role)} replace />
  }

  return <Outlet />
}

export function RequireActive() {
  const { session } = useAuth()

  if (session?.status !== 'active') {
    return <Navigate to={paths.login} replace />
  }

  return <Outlet />
}

export function RequireRole({ allow }: { allow: Role[] }) {
  const { session } = useAuth()

  if (!session || !allow.includes(session.role)) {
    return <Navigate to={paths.forbidden} replace />
  }

  return <Outlet />
}
