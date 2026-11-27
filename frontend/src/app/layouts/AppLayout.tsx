import { useState, type ReactNode } from 'react'
import { LogOut, Menu, UserRound } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet'
import {
  Nav,
  NavLinkItem,
  getAdminNav,
  getPrimaryNav,
  useApprovalCount,
} from '../../shared/components/Nav'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'
import { CompanyBrandMark } from '../../shared/components/CompanyBrandMark'
import { homeFor, paths } from '../../shared/constants/paths'
import { roleLabel } from '../../shared/types/session'
import { useCompanyBrand } from '../providers/CompanyBrandProvider'
import { useAuth } from '../providers/useAuth'

function getInitials(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return initials.toUpperCase() || 'U'
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { session, signOut } = useAuth()
  const { branding, logoSrc } = useCompanyBrand()
  const [menuOpen, setMenuOpen] = useState(false)
  const approvalCount = useApprovalCount(session?.role ?? 'staff')
  const workspaceName =
    branding?.name ?? session?.companyName ?? 'Leave request'

  if (!session) {
    return null
  }

  const primary = getPrimaryNav(session.role, approvalCount)
  const admin = getAdminNav(session.role)

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                aria-label="Open menu"
                className="md:hidden"
                size="icon"
                variant="ghost"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-4 py-4 text-left">
                <SheetTitle className="flex items-center gap-2 font-semibold">
                  <CompanyBrandMark logoUrl={logoSrc} />
                  {workspaceName}
                </SheetTitle>
              </SheetHeader>
              <div className="p-3">
                <Nav role={session.role} onNavigate={() => setMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Link
            to={homeFor(session.role)}
            className="flex min-w-0 items-center gap-2 text-foreground no-underline"
          >
            <CompanyBrandMark logoUrl={logoSrc} />
            <span className="truncate font-semibold">{workspaceName}</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="ml-4 hidden min-w-0 items-center gap-1 md:flex"
          >
            {primary.map((item) => (
              <NavLinkItem key={item.to} item={item} />
            ))}
            {admin.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="font-medium text-muted-foreground">
                    Company
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {admin.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to}>
                          <Icon aria-hidden="true" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 max-w-40 flex-col leading-tight lg:flex">
              <span className="truncate text-sm font-semibold text-foreground">
                {session.companyName ?? 'Workspace'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {roleLabel[session.role]}
              </span>
            </div>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`User menu for ${session.displayName}`}
                  className="size-11 shrink-0 rounded-full p-0 hover:bg-muted sm:size-10"
                  variant="ghost"
                  size="icon"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {getInitials(session.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{session.displayName}</span>
                  <span className="block font-normal text-muted-foreground">
                    {session.companyName ?? roleLabel[session.role]}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={paths.profile}>
                    <UserRound aria-hidden="true" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void signOut()}
                  variant="destructive"
                >
                  <LogOut aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-6xl flex-1 p-4 md:p-6">
        {children ?? <Outlet />}
      </div>
    </div>
  )
}
