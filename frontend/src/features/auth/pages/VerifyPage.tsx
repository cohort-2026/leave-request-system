import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { resendVerification, verifyEmail } from '../api'

function emailFromState(state: unknown): string {
  if (!state || typeof state !== 'object' || !('email' in state)) {
    return ''
  }
  const value = (state as { email?: unknown }).email
  return typeof value === 'string' ? value : ''
}

export function VerifyPage() {
  const { session, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const token = searchParams.get('token')?.trim() ?? ''

  const [email, setEmail] = useState(emailFromState(location.state))
  const [verifyState, setVerifyState] = useState<
    'idle' | 'working' | 'ok' | 'error'
  >(token ? 'working' : 'idle')
  const [verifyMessage, setVerifyMessage] = useState(
    token
      ? ''
      : 'Check Mailpit for the verification email, or request a new link.',
  )
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false
    setVerifyState('working')

    verifyEmail(token)
      .then(() => {
        if (cancelled) return
        setVerifyState('ok')
        setVerifyMessage('Email verified. You can sign in.')
      })
      .catch((error) => {
        if (cancelled) return
        setVerifyState('error')
        setVerifyMessage(
          error instanceof ApiError
            ? error.message
            : 'This verification link is invalid or has expired.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResendError('')
    setResendMessage('')
    setResending(true)

    try {
      const result = await resendVerification(email)
      setResendMessage(
        result.message ??
          'If that email is registered and still needs verifying, we sent a link.',
      )
    } catch (error) {
      setResendError(
        error instanceof ApiError
          ? error.message
          : 'Unable to send a verification email. Please try again.',
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <PageShell title="Verify email" eyebrow="Public">
      {verifyState === 'ok' ? (
        <Alert tone="info">{verifyMessage}</Alert>
      ) : null}
      {verifyState === 'error' ? (
        <Alert tone="error">{verifyMessage}</Alert>
      ) : null}
      {verifyState === 'working' ? (
        <Alert tone="info">Verifying your email…</Alert>
      ) : null}
      {verifyState === 'idle' && verifyMessage ? (
        <Alert tone="info">{verifyMessage}</Alert>
      ) : null}

      {verifyState === 'ok' ? (
        <p>
          <Link to={paths.login}>Sign in</Link>
        </p>
      ) : (
        <>
          {resendError ? <Alert tone="error">{resendError}</Alert> : null}
          {resendMessage ? <Alert tone="info">{resendMessage}</Alert> : null}
          <form className="flex flex-col gap-stack" onSubmit={handleResend}>
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={resending}
            />
            <Button variant="primary" type="submit" disabled={resending}>
              {resending ? 'Sending…' : 'Resend verification email'}
            </Button>
          </form>
          <p>
            Open <a href="http://localhost:8025">Mailpit</a> to read the link
            in local development.
          </p>
          <p>
            <Link to={paths.login}>Back to sign in</Link>
          </p>
        </>
      )}

      {session ? (
        <p>
          <Button variant="secondary" type="button" onClick={() => void signOut()}>
            Sign out
          </Button>
        </p>
      ) : null}
    </PageShell>
  )
}
