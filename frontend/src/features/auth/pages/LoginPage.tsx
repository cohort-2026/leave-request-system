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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => {
    return window.localStorage.getItem('leave-request:remember-me') === 'true'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)
    window.localStorage.setItem(
      'leave-request:remember-me',
      String(rememberMe),
    )

    try {
      const session = await login(email, password, rememberMe)
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
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          required
          disabled={submitting}
          trailingAction={
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              disabled={submitting}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          }
        />
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            disabled={submitting}
          />
          <span>Keep me signed in on this device</span>
        </label>
        <Button variant="primary" type="submit" disabled={submitting}>
          <span className={submitting ? 'button-loading' : undefined}>
            {submitting ? 'Signing in...' : 'Log in'}
          </span>
        </Button>
      </form>
      <p className="auth-switch">
        Don&apos;t have an account? <Link to={paths.register}>Register</Link>
      </p>
      <Button
        variant="secondary"
        type="button"
        className="invite-button"
        onClick={() => navigate(paths.joinInvite)}
      >
        Join with an organisation invite
      </Button>
      <p className="auth-secondary-link">
        <Link to={paths.forgotPassword}>Forgot password?</Link>
      </p>
      <div className="auth-help">
        <strong>Joining your organisation?</strong>
        <span>Use the invite link sent by your organisation administrator.</span>
        <span>Need help? Contact your organisation administrator.</span>
      </div>
      <p className="auth-trust">
        Secure workspace access. Your organisation&apos;s data stays private.
      </p>
      <nav className="auth-legal-links" aria-label="Legal and security information">
        <Link to={paths.privacy}>Privacy</Link>
        <Link to={paths.terms}>Terms</Link>
        <Link to={paths.security}>Security</Link>
        <Link to={paths.dpa}>DPA</Link>
      </nav>
    </PageShell>
  )
}
