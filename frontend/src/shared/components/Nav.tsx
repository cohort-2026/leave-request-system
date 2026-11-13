import { useEffect, useState } from 'react'
import {
  Ban,
  Building2,
  CalendarDays,
  CalendarRange,
  CalendarSync,
  ClipboardCheck,
  FileUp,
  House,
  Link2,
  Plus,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useMatch } from 'react-router-dom'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../components/ui/sidebar'
import { fetchTeamQueue } from '../../features/leave/leaveApi'
import { paths } from '../constants/paths'
import type { Role } from '../types/session'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: number
}

const companyNav: NavItem[] = [
  { to: paths.home, label: 'Home', icon: House, end: true },
  { to: paths.leave, label: 'My leave', icon: CalendarRange, end: true },
  { to: paths.leaveNew, label: 'Book leave', icon: Plus },
  { to: paths.calendar, label: 'Calendar', icon: CalendarDays },
  { to: paths.profile, label: 'Profile', icon: UserRound },
]

const managerNav: NavItem[] = [
  { to: paths.teamQueue, label: 'Approvals', icon: ClipboardCheck, end: true },
]

const adminNav: NavItem[] = [
  { to: paths.adminUsers, label: 'People', icon: UsersRound, end: true },
  { to: paths.adminImport, label: 'Import', icon: FileUp },
  { to: paths.adminDepartments, label: 'Departments', icon: Building2 },
  { to: paths.adminLeaveTypes, label: 'Leave types', icon: CalendarRange },
  {
    to: paths.adminCalendarSettings,
    label: 'Week and holidays',
    icon: CalendarSync,
  },
  { to: paths.adminBlocks, label: 'Blocked dates', icon: Ban },
  { to: paths.adminRules, label: 'Company rules', icon: Settings2 },
  { to: paths.adminOnboarding, label: 'Invite link', icon: Link2 },
  { to: paths.adminSso, label: 'Company SSO', icon: ShieldCheck },
]

const platformNav: NavItem[] = [
  { to: paths.platform, label: 'Companies', icon: Building2, end: true },
  { to: paths.platformNewCompany, label: 'New company', icon: Plus },
  { to: paths.profile, label: 'Profile', icon: UserRound },
]

function NavGroup({
  label,
  items,
  approvalCount,
}: {
  label: string
  items: NavItem[]
  approvalCount?: number | null
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavMenuItem
              key={item.to}
              item={
                item.to === paths.teamQueue && approvalCount !== undefined
                  ? { ...item, count: approvalCount ?? undefined }
                  : item
              }
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavMenuItem({ item }: { item: NavItem }) {
  const isActive = useMatch({
    path: item.to,
    end: item.end ?? false,
  })
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
        isActive={Boolean(isActive)}
        tooltip={item.label}
      >
        <NavLink to={item.to} end={item.end}>
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
      {item.count !== undefined ? (
        <SidebarMenuBadge aria-label={`${item.count} requests awaiting a decision`}>
          {item.count}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  )
}

type NavProps = {
  role: Role
}

export function Nav({ role }: NavProps) {
  const isPlatform = role === 'platform'
  const isManager = role === 'manager' || role === 'company_admin'
  const isAdmin = role === 'company_admin'
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
  }, [isManager])

  return (
    <nav aria-label="Primary navigation" className="contents">
      <NavGroup
        label={isPlatform ? 'Platform' : 'Workspace'}
        items={isPlatform ? platformNav : companyNav}
      />
      {isManager ? (
        <NavGroup
          label="Team"
          items={managerNav}
          approvalCount={approvalCount}
        />
      ) : null}
      {isAdmin ? <NavGroup label="Administration" items={adminNav} /> : null}
    </nav>
  )
}
