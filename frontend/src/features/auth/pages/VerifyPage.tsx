import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '../../../components/ui/empty'
import { Field, FieldLabel } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { getMe, resendVerification, verifyEmail } from '../api'

const INVALID_VERIFICATION_LINK =
  'This verification link is invalid or has expired.'
const RESEND_VERIFICATION_MESSAGE =
  'If that email is registered and still needs verifying, we sent a link. Open it to continue to sign in.'

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
    'idle' | 'working' | 'ok' | 'expired' | 'error'
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
      .then(async () => {
        if (cancelled) return
        if (authRef.current.session) {
          try {
            const me = await getMe()
            if (!cancelled) {
              authRef.current.signIn(me)
            }
          } catch {
            // Keep the existing session if /me cannot refresh.
          }
        }
        if (cancelled) return
        setVerifyState('ok')
        setVerifyMessage('Your email is verified. You can now continue.')
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 400) {
          setVerifyState('expired')
          return
        }
        setVerifyState('error')
        setVerifyMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to verify your email. Please try again.',
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
      await resendVerification(email)
      setResendMessage(RESEND_VERIFICATION_MESSAGE)
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

  const resendForm = (
    <form
      className="grid w-full gap-4"
      onSubmit={handleResend}
      aria-busy={resending}
    >
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={resending}
        />
      </Field>
      <Button type="submit" size="lg" disabled={resending}>
        {resending ? 'Sending...' : 'Send a new link'}
      </Button>
    </form>
  )

  return (
    <PageShell title="Verify email">
      <Card className="gap-0 border-border/70 bg-card py-0 shadow-sm ring-1 ring-foreground/5">
        <CardContent className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5">
          {verifyState === 'ok' ? (
            <>
              <Alert className="border-primary/20 bg-primary/5">
                {verifyMessage}
              </Alert>
              <p className="m-0 text-sm text-muted-foreground">
                Next, sign in to continue to your account.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link to={paths.login}>Continue to sign in</Link>
              </Button>
            </>
          ) : verifyState === 'expired' ? (
            <Empty className="gap-5 py-2">
              <EmptyHeader>
                <EmptyTitle>This verification link can&apos;t be used</EmptyTitle>
                <EmptyDescription>
                  {INVALID_VERIFICATION_LINK} Send a new link, then open it to
                  continue to sign in.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {resendError ? (
                  <Alert variant="destructive">{resendError}</Alert>
                ) : null}
                {resendMessage ? (
                  <Alert aria-live="polite">{resendMessage}</Alert>
                ) : null}
                {resendForm}
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {verifyState === 'error' ? (
                <Alert variant="destructive">{verifyMessage}</Alert>
              ) : null}
              {verifyState === 'working' ? (
                <Alert aria-live="polite">Verifying your email...</Alert>
              ) : null}
              {verifyState === 'idle' ? (
                <Alert>
                  {email ? (
                    <>
                      We sent a verification link to <strong>{email}</strong>.
                      Check your inbox or send a new link below.
                    </>
                  ) : (
                    'Enter your email to send a new verification link.'
                  )}
                </Alert>
              ) : null}
              {resendError ? (
                <Alert variant="destructive">{resendError}</Alert>
              ) : null}
              {resendMessage ? (
                <Alert aria-live="polite">{resendMessage}</Alert>
              ) : null}
              {resendForm}
            </>
          )}
        </CardContent>
      </Card>

      {actionError ? (
        <Alert variant="destructive">{actionError}</Alert>
      ) : null}
      {session ? (
        <Button
          variant="outline"
          type="button"
          className="w-full"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
      ) : null}
    </PageShell>
  )
}
