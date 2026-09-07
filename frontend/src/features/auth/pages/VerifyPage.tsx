import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Button } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function VerifyPage() {
  const { session, signOut } = useAuth()

  return (
    <PageShell title="Verify email" eyebrow="Public · after claim">
      <p className="muted">
        Claim created the login on the imported person. Until this email is
        marked verified, leave stays closed.
      </p>
      {session ? (
        <p>
          <Button variant="secondary" type="button" onClick={signOut}>
            Sign out
          </Button>
        </p>
      ) : (
        <p>
          <Link to={paths.login}>Back to sign in</Link>
        </p>
      )}
    </PageShell>
  )
}
