import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { homeFor, paths } from '../../../shared/constants/paths'
import { useAuth } from '../../../app/providers/useAuth'

export function ForbiddenPage() {
  const { session } = useAuth()
  const home = session ? homeFor(session.role) : paths.login
  const contact =
    session?.role === 'platform'
      ? 'a platform administrator'
      : 'your company administrator'

  return (
    <PageShell title="You don&apos;t have access" eyebrow="403 · Forbidden">
      <Alert variant="destructive">
        This page is restricted to other roles, so its contents aren&apos;t shown.
        Ask {contact} to confirm whether you should have access.
      </Alert>
      <Button asChild variant="outline">
        <Link to={home}>Go to home</Link>
      </Button>
    </PageShell>
  )
}
