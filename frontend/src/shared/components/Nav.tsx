import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarDays,
  CalendarRange,
  CalendarSync,
  ClipboardCheck,
  House,
  Link2,
  Palette,
  Plus,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { Badge } from '../../components/ui/badge'
import { fetchTeamQueue } from '../../features/leave/leaveApi'
import { paths } from '../constants/paths'
import type { Role } from '../types/session'
import { cn } from '../../lib/utils'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: number
}

const companyPrimary: NavItem[] = [
  { to: paths.home, label: 'Home', icon: House, end: true },
  { to: paths.leave, label: 'My leave', icon: CalendarRange, end: true },
  { to: paths.calendar, label: 'Calendar', icon: CalendarDays },
]

const managerPrimary: NavItem[] = [
  { to: paths.teamQueue, label: 'Approvals', icon: ClipboardCheck, end: true },
]

const adminPrimary: NavItem[] = [
  { to: paths.adminUsers, label: 'People', icon: UsersRound, end: true },
  { to: paths.adminDepartments, label: 'Departments', icon: Building2 },
  { to: paths.adminLeaveTypes, label: 'Leave types', icon: CalendarRange },
  {
    to: paths.adminCalendarSettings,
    label: 'Week and holidays',
    icon: CalendarSync,
  },
  { to: paths.adminOnboarding, label: 'Invite link', icon: Link2 },
  { to: paths.adminBranding, label: 'Appearance', icon: Palette },
]

const platformPrimary: NavItem[] = [
  { to: paths.platform, label: 'Companies', icon: Building2, end: true },
  { to: paths.platformNewCompany, label: 'New company', icon: Plus },
]

export function useApprovalCount(role: Role) {
  const { pathname } = useLocation()
  const isManager = role === 'manager' || role === 'company_admin'
  const [approvalCount, setApprovalCount] = useState<number | null>(null)

  useEffect(() => {
    if (!isManager) return

    let active = true
    const refreshCount = () => {
      fetchTeamQueue()
        .then((items) => {
          if (active) setApprovalCount(items.length)
        })
        .catch(() => {
          if (active) setApprovalCount(null)
        })
    }

    refreshCount()
    window.addEventListener('team-queue-updated', refreshCount)
    return () => {
      active = false
      window.removeEventListener('team-queue-updated', refreshCount)
    }
  }, [isManager, pathname])

  return approvalCount
}

export function getPrimaryNav(role: Role, approvalCount?: number | null): NavItem[] {
  if (role === 'platform') return platformPrimary

  const items = [...companyPrimary]
  if (role === 'manager' || role === 'company_admin') {
    items.push(
      approvalCount != null
        ? { ...managerPrimary[0], count: approvalCount }
        : managerPrimary[0],
    )
  }
  return items
}

export function getAdminNav(role: Role): NavItem[] {
  return role === 'company_admin' ? adminPrimary : []
}

export function NavLinkItem({
  item,
  onNavigate,
  className,
}: {
  item: NavItem
  onNavigate?: () => void
  className?: string
}) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          isActive && 'bg-accent text-accent-foreground',
          className,
        )
      }
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{item.label}</span>
      {item.count !== undefined ? (
        <Badge
          variant="secondary"
          className="ml-auto h-5 min-w-5 justify-center px-1.5"
          aria-label={`${item.count} requests awaiting a decision`}
        >
          {item.count}
        </Badge>
      ) : null}
    </NavLink>
  )
}

type NavProps = {
  role: Role
  onNavigate?: () => void
  className?: string
}

export function Nav({ role, onNavigate, className }: NavProps) {
  const approvalCount = useApprovalCount(role)
  const primary = getPrimaryNav(role, approvalCount)
  const admin = getAdminNav(role)

  return (
    <nav aria-label="Primary navigation" className={cn('flex flex-col gap-1', className)}>
      {primary.map((item) => (
        <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />
      ))}
      {admin.length > 0 ? (
        <div className="mt-3 grid gap-1">
          <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Company
          </p>
          {admin.map((item) => (
            <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
      <NavLinkItem
        item={{ to: paths.profile, label: 'Profile', icon: UserRound }}
        onNavigate={onNavigate}
        className="md:hidden"
      />
    </nav>
  )
}
