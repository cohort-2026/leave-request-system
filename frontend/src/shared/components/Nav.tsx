/**
 * Usage: <Nav role={session.role} />
 */
import { NavLink } from 'react-router-dom'
import { paths } from '../constants/paths'
import type { Role } from '../types/session'

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

type NavProps = {
  role: Role
  className?: string
}

export function Nav({ role, className = '' }: NavProps) {
  const isPlatform = role === 'platform'
  const isManager = role === 'manager' || role === 'company_admin'
  const isAdmin = role === 'company_admin'
  const classes = ['nav-groups', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {isPlatform ? (
        <NavGroup items={platformNav} />
      ) : (
        <NavGroup items={companyNav} />
      )}
      {isManager ? <NavGroup items={managerNav} /> : null}
      {isAdmin ? <NavGroup items={adminNav} /> : null}
    </div>
  )
}
