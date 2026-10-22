import { useEffect, useRef, useState } from 'react'
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
  const { session, signIn, signOut } = useAuth()
  const authRef = useRef({ session, signIn })
  const verificationRequest = useRef<{
    token: string
    promise: ReturnType<typeof verifyEmail>
  } | null>(null)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const token = searchParams.get('token')?.trim() ?? ''

  const [email, setEmail] = useState(
    () => emailFromState(location.state) || session?.email || '',
  )
  const [verifyState, setVerifyState] = useState<
    'idle' | 'working' | 'ok' | 'error'
  >(token ? 'working' : 'idle')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const [actionError, setActionError] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    authRef.current = { session, signIn }
  }, [session, signIn])

  useEffect(() => {
    if (!token || verifyState !== 'working') {
      return
    }

    let cancelled = false
    if (verificationRequest.current?.token !== token) {
      verificationRequest.current = { token, promise: verifyEmail(token) }
    }

    verificationRequest.current.promise
      .then(() => {
        if (cancelled) return
        const currentSession = authRef.current.session
        if (currentSession) {
          authRef.current.signIn({ ...currentSession, status: 'active' })
        }
        setVerifyState('ok')
        setVerifyMessage('Your email is verified. You can now continue.')
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
  }, [token, verifyState])

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

  async function handleSignOut() {
    setActionError('')
    try {
      await signOut()
    } catch {
      setActionError('Unable to sign out. Please try again.')
    }
  }

  return (
    <PageShell title="Verify email" eyebrow="Public">
      {verifyState === 'ok' ? (
        <Alert tone="success">{verifyMessage}</Alert>
      ) : null}
      {verifyState === 'error' ? (
        <Alert tone="error">{verifyMessage}</Alert>
      ) : null}
      {verifyState === 'working' ? (
        <Alert tone="info">Verifying your email…</Alert>
      ) : null}
      {verifyState === 'idle' ? (
        <Alert tone="info">
          {email ? (
            <>
              We sent a verification link to <strong>{email}</strong>. Check
              your inbox, or resend it below.
            </>
          ) : (
            'Check your inbox for the verification link, or enter your email to request another.'
          )}
        </Alert>
      ) : null}

      {verifyState === 'ok' ? (
        <Link
          to={paths.login}
          className="button button-primary auth-full-button"
        >
          {session ? 'Continue to your account' : 'Sign in'}
        </Link>
      ) : (
        <>
          {resendError ? <Alert tone="error">{resendError}</Alert> : null}
          {resendMessage ? <Alert tone="success">{resendMessage}</Alert> : null}
          <form
            className="auth-form"
            onSubmit={handleResend}
            aria-busy={resending}
          >
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
          <p className="auth-help">
            In local development, open{' '}
            <a href="http://localhost:8025">Mailpit</a> to find the email.
          </p>
          <p className="auth-footer">
            <Link to={paths.login}>Back to sign in</Link>
          </p>
        </>
      )}

      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {session ? (
        <Button
          variant="secondary"
          type="button"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
      ) : null}
    </PageShell>
  )
}
