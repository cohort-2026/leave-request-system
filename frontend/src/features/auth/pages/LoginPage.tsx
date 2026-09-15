import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths, homeFor } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { login } from '../api'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const session = await login(email, password)
      signIn(session)

      if (session.status === 'pending_verification') {
        navigate(paths.verify, { replace: true })
        return
      }
      if (session.status === 'pending_approval') {
        navigate(paths.pendingApproval, { replace: true })
        return
      }

      navigate(homeFor(session.role), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setFormError(error.message)
      } else {
        setFormError('Unable to sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Welcome back" eyebrow="Member sign in">
      <p className="auth-lede">Sign in to keep your leave plans moving.</p>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <form className="auth-form flex flex-col gap-stack" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          required
          disabled={submitting}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          required
          disabled={submitting}
        />
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
      <p className="auth-switch">
        Don&apos;t have an account? <Link to={paths.register}>Register</Link>
      </p>
      <p className="auth-secondary-link">
        <Link to={paths.forgotPassword}>Forgot password?</Link>
      </p>
    </PageShell>
  )
}
