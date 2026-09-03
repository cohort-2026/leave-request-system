// frontend/src/shared/components/Nav.tsx
//
// Extracted directly from AppLayout: same NavItem groups, same role
// branching (isPlatform / isManager / isAdmin), same react-router NavLink
// behavior. AppLayout now just renders <Nav role={session.role} />.
//
// NOTE: confirm the import path/name for the Role type below — it's
// inferred from AppLayout's `session.role` usage (paths import assumes
// this file lives at frontend/src/shared/components/Nav.tsx, so the
// original '../../shared/constants/paths' becomes '../constants/paths').

import { NavLink } from 'react-router-dom'
import { paths } from '../constants/paths'

// TODO: replace with the real exported type, e.g.
// import type { Role } from '../types/session'
type Role = 'employee' | 'manager' | 'company_admin' | 'platform'

type NavItem = { to: string; label: string; end?: boolean }

const companyNav: NavItem[] = [
  { to: paths.home, label: 'Home', end: true },
  { to: paths.leave, label: 'My leave', end: true },
  { to: paths.leaveNew, label: 'Book leave' },
  { to: paths.calendar, label: 'Calendar' },
]

const managerNav: NavItem[] = [{ to: paths.teamQueue, label: 'Team queue', end: true }]

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

function NavGroup({ items, className }: { items: NavItem[]; className?: string }) {
  return (
    <nav className={className ?? 'nav'}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export interface NavProps {
  role: Role
  className?: string
  variant?: string
}

export function Nav({ role, className, variant }: NavProps) {
  const isPlatform = role === 'platform'
  const isManager = role === 'manager' || role === 'company_admin'
  const isAdmin = role === 'company_admin'

  return (
    <div data-variant={variant}>
      {isPlatform ? (
        <NavGroup items={platformNav} className={className} />
      ) : (
        <NavGroup items={companyNav} className={className} />
      )}
      {isManager ? <NavGroup items={managerNav} className={className} /> : null}
      {isAdmin ? <NavGroup items={adminNav} className={className} /> : null}
    </div>
  )
}
