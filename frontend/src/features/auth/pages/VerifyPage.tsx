import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { homeFor, paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { verifyEmail } from '../api'

export function VerifyPage() {
  const { session, signIn, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const stateEmail = (location.state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(stateEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const nextSession = await verifyEmail(email, code)
      signIn(nextSession)
      navigate(homeFor(nextSession.role), { replace: true })
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to verify your email. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Verify your email" eyebrow="Email verification">
      <p>
        Enter the six-digit code sent to your email. The code expires after 10
        minutes.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={submitting}
        />
        <TextField
          label="Verification code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          required
          disabled={submitting}
        />
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>
      {session ? (
        <p>
          <Button variant="secondary" type="button" onClick={() => void signOut()}>
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
