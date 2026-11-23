import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { paths } from '../../shared/constants/paths'
import { VAT_NOTE } from '../../features/marketing/plans'

export function MarketingLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-[#faf8f5] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#faf8f5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link
            to={paths.home}
            className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-stone-900"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <CalendarDays aria-hidden="true" className="size-4" />
            </span>
            <span className="truncate">Leave request</span>
          </Link>
          <nav
            className="flex shrink-0 items-center gap-0.5 sm:gap-2"
            aria-label="Marketing"
          >
            <NavLink
              to={paths.pricing}
              className={({ isActive }) =>
                `rounded-md px-2 py-1.5 text-sm whitespace-nowrap sm:px-3 ${
                  isActive
                    ? 'font-medium text-stone-900'
                    : 'text-stone-600 hover:text-stone-900'
                }`
              }
            >
              Pricing
            </NavLink>
            <NavLink
              to={paths.login}
              className="rounded-md px-2 py-1.5 text-sm whitespace-nowrap text-stone-600 hover:text-stone-900 sm:px-3"
            >
              Sign in
            </NavLink>
            <Button asChild className="h-9 px-3 sm:px-3.5">
              <Link to={paths.startCompany}>
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start your company</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children ?? <Outlet />}</main>
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] sm:px-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <span className="flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white">
                <CalendarDays aria-hidden="true" className="size-3.5" />
              </span>
              Leave request
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-stone-500">
              Time off for companies. Each workspace keeps its own people,
              rules, and calendar.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to={paths.pricing} className="text-stone-600 hover:text-stone-900">
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to={paths.startCompany}
                  className="text-stone-600 hover:text-stone-900"
                >
                  Start your company
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Account
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to={paths.login} className="text-stone-600 hover:text-stone-900">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="border-t border-stone-200 px-5 py-4 text-center text-xs text-stone-500 sm:px-8">
          {VAT_NOTE}
        </p>
      </footer>
    </div>
  )
}
