import { CalendarDays } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/card'
import { paths } from '../../shared/constants/paths'

export function PublicLayout() {
  const location = useLocation()
  const isCompanySignup =
    location.pathname === paths.startCompany ||
    location.pathname === paths.startCompanyPay

  if (isCompanySignup) {
    return (
      <div className="public-shell public-shell--company-signup">
        <div className="public-card public-card--company-signup">
          <Link
            to={paths.home}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-stone-900 no-underline"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <CalendarDays aria-hidden="true" className="size-4" />
            </span>
            Leave request
          </Link>
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <div className="public-shell">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          to={paths.login}
          className="flex flex-col items-center gap-2 text-foreground no-underline"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays aria-hidden="true" className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Leave request
          </span>
        </Link>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
