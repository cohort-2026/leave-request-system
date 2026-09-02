import { Link, Outlet } from 'react-router-dom'
import { paths } from '../../shared/constants/paths'

export function PublicLayout() {
  return (
    <div className="public-shell">
      <div className="public-card">
        <p className="brand">
          <Link to={paths.login}>Leave request</Link>
        </p>
        <Outlet />
      </div>
    </div>
  )
}
