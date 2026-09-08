import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function OnboardPage() {
  const { token } = useParams()

  return (
    <PageShell title="Claim a staff number" eyebrow="Public · token-scoped">
      <Alert tone="info">
        Invite token: <code>{token}</code>. Finds this company’s imported person
        by staff number and attaches a password to that same row.
      </Alert>
      <form
        className="flex flex-col gap-stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <TextField label="Staff number" name="employeeNumber" autoComplete="username" />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <Button variant="primary" type="submit" disabled>
          Claim (wired later)
        </Button>
      </form>
      <p>
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}
