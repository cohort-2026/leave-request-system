import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { AppLayout } from './layouts/AppLayout'
import { useAuth } from './providers/useAuth'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../components/ui/empty'
import { Button } from '../components/ui/button'
import { homeFor, paths } from '../shared/constants/paths'

export function NotFoundPage() {
  const { session } = useAuth()
  const home = session ? homeFor(session.role) : paths.login

  const content = (
    <Empty className="mx-auto max-w-lg border bg-card px-6 py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>We can&apos;t find that page</EmptyTitle>
        <EmptyDescription>
          This address does not exist, or the record is not in your company.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={home}>{session ? 'Go to home' : 'Sign in'}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )

  if (session) {
    return <AppLayout>{content}</AppLayout>
  }

  return (
    <div className="public-shell">
      <div className="public-card">{content}</div>
    </div>
  )
}
