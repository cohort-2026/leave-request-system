import { Link, Outlet, useLocation } from 'react-router-dom'
import { paths } from '../../shared/constants/paths'

export function PublicLayout() {
  const location = useLocation()
  const isCompanySignup =
    location.pathname === paths.startCompany ||
    location.pathname === paths.startCompanyPay

  return (
    <div
      className={`public-shell${isCompanySignup ? ' public-shell--company-signup' : ''}`}
    >
      <div
        className={`public-card${isCompanySignup ? ' public-card--company-signup' : ''}`}
      >
        <p className="brand">
          <Link to={paths.login}>Leave request</Link>
        </p>
        <Outlet />
      </div>
    </div>
  )
}
