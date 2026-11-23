import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '../../../components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '../../../components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '../../../components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { ApiError } from '../../../services/api'
import { paths } from '../../../shared/constants/paths'
import {
  confirmTotpReset,
  confirmSignedInTotpEnroll,
  isTotpEnrollment,
  type TotpEnrollmentChallenge,
} from '../api'

const inflight = new Map<
  string,
  Promise<TotpEnrollmentChallenge | { ok: true; totpReset: true }>
>()
const RESET_LINK_INVALID =
  'This authenticator reset link is invalid or has expired.'

type ResetResult =
  | {
      token: string
      state: 'enroll'
      message: string
      enrollment: TotpEnrollmentChallenge
    }
  | {
      token: string
      state: 'ok' | 'error'
      message: string
    }

function confirmTotpResetOnce(token: string) {
  const existing = inflight.get(token)
  if (existing) {
    return existing
  }
  const pending = confirmTotpReset(token)
  inflight.set(token, pending)
  pending.catch(() => {
    inflight.delete(token)
  })
  return pending
}

export function ResetAuthenticatorPage() {
  const { session, loading, signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [result, setResult] = useState<ResetResult | null>(null)
  const currentResult = result?.token === token ? result : null
  const state = !token ? 'error' : currentResult?.state ?? 'working'
  const message = !token
    ? RESET_LINK_INVALID
    : currentResult?.message ?? ''
  const enrollment =
    currentResult?.state === 'enroll' ? currentResult.enrollment : null
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setCode('')
    setFormError('')
    setRecoveryCodes([])
  }, [token])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    confirmTotpResetOnce(token)
      .then((next) => {
        if (cancelled) return
        if (isTotpEnrollment(next)) {
          setResult({
            token,
            state: 'enroll',
            message:
              'Your old authenticator was removed. Set up a new one to finish the reset.',
            enrollment: next,
          })
          return
        }
        setResult({
          token,
          state: 'ok',
          message: 'Authenticator removed. Sign in to set up a new one.',
        })
      })
      .catch((error) => {
        if (cancelled) return
        setResult({
          token,
          state: 'error',
          message:
            error instanceof ApiError ? error.message : RESET_LINK_INVALID,
        })
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleEnroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (code.length !== 6 || submitting) return

    setSubmitting(true)
    try {
      const { recoveryCodes: nextRecoveryCodes, ...nextSession } =
        await confirmSignedInTotpEnroll(code)
      signIn(nextSession)
      setRecoveryCodes(nextRecoveryCodes)
      setCode('')
      setResult({
        token,
        state: 'ok',
        message: 'Your new authenticator is set up.',
      })
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to confirm the authenticator. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return null
  }

  const continueHref = session ? paths.profile : paths.login
  const continueLabel =
    state === 'error'
      ? session
        ? 'Back to profile'
        : 'Continue to sign in'
      : session
        ? 'Continue to profile'
        : 'Continue to sign in'
  const errorHint = session
    ? 'Request a new authenticator reset from your profile.'
    : 'Sign in, then request a new authenticator reset from your profile.'

  return (
    <PageShell title="Reset authenticator">
      {state === 'error' ? (
        <Card className="gap-0 border-border/70 bg-card py-0 shadow-sm ring-1 ring-foreground/5">
          <CardContent className="px-4 py-6 sm:px-5 sm:py-8">
            <Empty className="gap-5">
              <EmptyHeader>
                <EmptyTitle>
                  This reset link can&apos;t be used
                </EmptyTitle>
                <EmptyDescription>
                  {message} {errorHint}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild size="lg" className="w-full">
                  <Link to={continueHref}>{continueLabel}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 border-border/70 bg-card py-0 shadow-sm ring-1 ring-foreground/5">
          <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardDescription>
              {state === 'working'
                ? 'We are confirming your reset link. Next, you will set up a new authenticator if you are signed in.'
                : message}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
            {state === 'working' ? (
              <Alert aria-live="polite">
                Confirming authenticator reset…
              </Alert>
            ) : null}

            {state === 'enroll' && enrollment ? (
              <>
                <div
                  role="img"
                  aria-label="Authenticator setup QR code"
                  className="w-fit max-w-48 rounded-lg border bg-card p-3"
                  dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
                />
                <Field>
                  <FieldLabel htmlFor="authenticator-secret">
                    Setup key
                  </FieldLabel>
                  <Input
                    id="authenticator-secret"
                    className="h-9 w-full rounded-lg border border-input bg-muted px-3 font-mono text-sm"
                    value={enrollment.secret}
                    readOnly
                  />
                  <FieldDescription>
                    Scan the QR code with your authenticator app, or enter this
                    setup key manually.
                  </FieldDescription>
                </Field>
                <form
                  className="grid gap-4"
                  onSubmit={handleEnroll}
                  aria-busy={submitting}
                >
                  {formError ? (
                    <Alert variant="destructive">{formError}</Alert>
                  ) : null}
                  <Field>
                    <FieldLabel htmlFor="authenticator-code">
                      6-digit code
                    </FieldLabel>
                    <InputOTP
                      id="authenticator-code"
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS}
                      value={code}
                      onChange={(value) => {
                        setCode(value)
                        setFormError('')
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-label="6-digit authenticator code"
                      disabled={submitting}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }, (_, index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            aria-label={`Digit ${index + 1}`}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <FieldDescription>
                      Enter the current code from your authenticator app. Next,
                      we&apos;ll confirm setup and show your recovery codes.
                    </FieldDescription>
                  </Field>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitting || code.length !== 6}
                  >
                    {submitting ? 'Confirming…' : 'Confirm new authenticator'}
                  </Button>
                </form>
              </>
            ) : null}

            {state === 'ok' ? (
              <>
                <Alert aria-live="polite">{message}</Alert>
                {recoveryCodes.length > 0 ? (
                  <>
                    <p className="m-0 text-sm text-muted-foreground">
                      Save these recovery codes somewhere safe. Each code works
                      once, and they will not be shown again.
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {recoveryCodes.map((item) => (
                        <li key={item}>
                          <code className="block rounded-md bg-muted px-2.5 py-1.5 font-mono text-sm">
                            {item}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <Button asChild size="lg" className="w-full">
                  <Link to={continueHref}>{continueLabel}</Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
