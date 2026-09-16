import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { homeFor, paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { login, resendLoginOtp, verifyLoginOtp } from '../api'
import type { Session } from '../../../shared/types/session'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  function finishLogin(session: Session) {
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setInfoMessage('')
    setNeedsVerify(false)
    setSubmitting(true)

    try {
      const result = await login(email, password)
      if (result.otpRequired) {
        setOtpStep(true)
        setInfoMessage(
          'Check Mailpit for a 6-digit sign-in code, then enter it below.',
        )
        return
      }
      finishLogin(result.session)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setFormError(error.message)
        setNeedsVerify(error.status === 403)
      } else {
        setFormError('Unable to sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setInfoMessage('')
    setSubmitting(true)

    try {
      const session = await verifyLoginOtp(email, code)
      finishLogin(session)
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to verify the sign-in code. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setFormError('')
    setInfoMessage('')
    setResending(true)
    try {
      const result = await resendLoginOtp(email)
      setInfoMessage(
        result.message ??
          'If that email just signed in, we sent a new code.',
      )
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to send a new code. Please try again.',
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <PageShell title="Sign in" eyebrow="Public">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {infoMessage ? <Alert tone="info">{infoMessage}</Alert> : null}

      {otpStep ? (
        <>
          <form className="flex flex-col gap-stack" onSubmit={handleOtpSubmit}>
            <TextField
              label="Sign-in code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              disabled={submitting}
            />
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Checking…' : 'Verify code'}
            </Button>
          </form>
          <p>
            Open <a href="http://localhost:8025">Mailpit</a> to read the code
            in local development.
          </p>
          <p>
            <Button
              variant="secondary"
              type="button"
              disabled={resending || submitting}
              onClick={() => void handleResend()}
            >
              {resending ? 'Sending…' : 'Resend code'}
            </Button>
          </p>
          <p>
            <Button
              variant="secondary"
              type="button"
              disabled={submitting}
              onClick={() => {
                setOtpStep(false)
                setCode('')
                setFormError('')
                setInfoMessage('')
              }}
            >
              Back to password
            </Button>
          </p>
        </>
      ) : (
        <>
          <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
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
          {needsVerify ? (
            <p>
              <Link to={paths.verify}>Verify your email or request a new link</Link>
            </p>
          ) : null}
          <p>
            Don&apos;t have an account? <Link to={paths.register}>Register</Link>
          </p>
        </>
      )}
    </PageShell>
  )
}
