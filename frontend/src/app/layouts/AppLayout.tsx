import { NavLink, Outlet } from 'react-router-dom'
import { paths } from '../../shared/constants/paths'
import { roleLabel } from '../../shared/types/session'
import { useAuth } from '../providers/useAuth'

type NavItem = { to: string; label: string; end?: boolean }

const companyNav: NavItem[] = [
  { to: paths.home, label: 'Home', end: true },
  { to: paths.leave, label: 'My leave', end: true },
  { to: paths.leaveNew, label: 'Book leave' },
  { to: paths.calendar, label: 'Calendar' },
]

const managerNav: NavItem[] = [
  { to: paths.teamQueue, label: 'Team queue', end: true },
]

const adminNav: NavItem[] = [
  { to: paths.adminUsers, label: 'People', end: true },
  { to: paths.adminApprovals, label: 'Approvals' },
  { to: paths.adminImport, label: 'Import' },
  { to: paths.adminDepartments, label: 'Departments' },
  { to: paths.adminLeaveTypes, label: 'Leave types' },
  { to: paths.adminCalendarSettings, label: 'Week and holidays' },
  { to: paths.adminBlocks, label: 'Blocked dates' },
  { to: paths.adminRules, label: 'Company rules' },
  { to: paths.adminOnboarding, label: 'Invite link' },
]

const platformNav: NavItem[] = [
  { to: paths.platform, label: 'Companies', end: true },
  { to: paths.platformNewCompany, label: 'New company' },
]

function NavGroup({ items }: { items: NavItem[] }) {
  return (
    <nav className="nav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const { session, signOut } = useAuth()

  if (!session) {
    return null
  }

  const isPlatform = session.role === 'platform'
  const isManager = session.role === 'manager' || session.role === 'company_admin'
  const isAdmin = session.role === 'company_admin'

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
        {isPlatform ? <NavGroup items={platformNav} /> : <NavGroup items={companyNav} />}
        {isManager ? <NavGroup items={managerNav} /> : null}
        {isAdmin ? <NavGroup items={adminNav} /> : null}
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
