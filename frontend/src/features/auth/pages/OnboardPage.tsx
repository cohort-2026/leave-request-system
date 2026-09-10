import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function OnboardPage() {
  const { token } = useParams()

  return (
    <PageShell title="Claim a staff number" eyebrow="Public · token-scoped">
      <p className="muted">
        Invite token: <code>{token}</code>. Finds this company’s imported person
        by staff number and attaches a password to that same row.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label>
          Staff number
          <input name="employeeNumber" />
        </label>
        <label>
          Password
          <input type="password" name="password" />
        </label>
        <button type="submit" disabled>
          Claim (wired later)
        </button>
      </form>
      <p>
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}
