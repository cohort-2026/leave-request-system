import type { ReactNode } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  LogOut,
  Search,
  UserRound,
} from 'lucide-react'
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
import { Input } from '../../components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '../../components/ui/sidebar'
import { Separator } from '../../components/ui/separator'
import { TooltipProvider } from '../../components/ui/tooltip'
import { Nav } from '../../shared/components'
import { homeFor, paths } from '../../shared/constants/paths'
import { roleLabel } from '../../shared/types/session'
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

  if (!session) {
    return null
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="gap-3 px-3 py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg" tooltip="Leave request">
                  <Link to={homeFor(session.role)}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <CalendarDays aria-hidden="true" className="size-5" />
                    </span>
                    <span className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate font-semibold">
                        Leave request
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/65">
                        Management
                      </span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="mx-1 w-auto" />
          </SidebarHeader>
          <SidebarContent>
            <Nav role={session.role} />
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur sm:px-5 lg:px-7">
            <SidebarTrigger aria-label="Toggle navigation" />
            <Separator
              orientation="vertical"
              className="mx-0 hidden h-6 md:block"
            />
            <div className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-sm font-semibold text-foreground">
                {session.companyName ?? 'Workspace'}
              </span>
              <span className="text-xs text-muted-foreground">
                Leave management
              </span>
            </div>

            <label className="relative ml-auto flex w-32 items-center sm:w-56 lg:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
              />
              <Input
                aria-label="Search (visual only)"
                className="h-9 bg-card pl-8"
                placeholder="Search..."
                type="search"
              />
            </label>

            <Button
              aria-label="Notifications (unavailable)"
              className="shrink-0"
              disabled
              title="Notifications are not available yet"
              variant="ghost"
              size="icon"
            >
              <Bell aria-hidden="true" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`User menu for ${session.displayName}`}
                  className="h-auto shrink-0 gap-2 rounded-xl px-1.5 py-1 hover:bg-muted sm:px-2"
                  variant="ghost"
                  size="lg"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {getInitials(session.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 text-left leading-tight sm:grid">
                    <span className="truncate text-sm font-medium text-foreground">
                      {session.displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {roleLabel[session.role]}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="hidden size-4 text-muted-foreground sm:block"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{session.displayName}</span>
                  <span className="block font-normal text-muted-foreground">
                    {roleLabel[session.role]}
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
          </header>

          <div className="min-w-0 flex-1 p-4 md:p-6">
            {children ?? <Outlet />}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
