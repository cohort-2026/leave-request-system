import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { paths } from '../../shared/constants/paths'
import { VAT_NOTE } from '../../features/marketing/plans'

export function MarketingLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <p className="brand">
          <Link to={paths.home}>Leave request</Link>
        </p>
        <nav className="marketing-nav" aria-label="Marketing">
          <NavLink to={paths.pricing}>Pricing</NavLink>
          <NavLink to={paths.login}>Sign in</NavLink>
          <Link to={paths.startCompany} className="marketing-cta">
            Start your company
          </Link>
        </nav>
      </header>
      <main className="marketing-main">{children ?? <Outlet />}</main>
      <footer className="marketing-footer">
        <p>{VAT_NOTE}</p>
      </footer>
    </div>
  )
}
