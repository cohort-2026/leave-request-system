import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { resetPassword } from '../api'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 1024
const RESET_LINK_BAD = 'This reset link is invalid or has expired.'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [rejectedToken, setRejectedToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const passwordLengthValid =
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword
  const linkExpired = !token || rejectedToken === token

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!token) {
      return
    }
    if (!passwordLengthValid) {
      setFormError('Use a password between 8 and 1024 characters.')
      return
    }
    if (!passwordsMatch) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      if (session) {
        await signOut()
      }
      navigate(paths.login, { replace: true, state: { passwordReset: true } })
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === RESET_LINK_BAD
      ) {
        setRejectedToken(token)
        return
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to reset your password. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Reset password">
      {linkExpired ? (
        <Card className="gap-0 border-border/70 bg-card py-0 shadow-sm ring-1 ring-foreground/5">
          <CardContent className="px-4 py-6 sm:px-5 sm:py-8">
            <Empty className="gap-5">
              <EmptyHeader>
                <EmptyTitle>This reset link can&apos;t be used</EmptyTitle>
                <EmptyDescription>
                  It may have expired or already been used. Request a new link
                  to choose a password.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild size="lg" className="w-full">
                  <Link to={paths.forgotPassword}>
                    Request a new reset link
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 border-border/70 bg-card py-0 shadow-sm ring-1 ring-foreground/5">
          <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardDescription>
              Choose a new password. You&apos;ll sign in with it after the reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
            {formError ? (
              <Alert variant="destructive">{formError}</Alert>
            ) : null}
            <form
              className="grid gap-4"
              onSubmit={handleSubmit}
              aria-busy={submitting}
            >
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setFormError('')
                  }}
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  aria-describedby="password-rules"
                  required
                  disabled={submitting}
                />
                <FieldDescription
                  id="password-rules"
                  aria-live="polite"
                  className={
                    passwordLengthValid
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : undefined
                  }
                >
                  {passwordLengthValid
                    ? 'Password length is valid (8 to 1024 characters).'
                    : 'Use 8 to 1024 characters.'}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setFormError('')
                  }}
                  aria-describedby="confirm-password-rules"
                  aria-invalid={
                    confirmPassword.length > 0 && !passwordsMatch
                  }
                  required
                  disabled={submitting}
                />
                <FieldDescription
                  id="confirm-password-rules"
                  aria-live="polite"
                  className={
                    passwordsMatch
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : undefined
                  }
                >
                  {confirmPassword.length === 0
                    ? 'Enter your new password again.'
                    : passwordsMatch
                      ? 'Passwords match.'
                      : 'Passwords do not match.'}
                </FieldDescription>
              </Field>
              <Button
                type="submit"
                size="lg"
                disabled={
                  submitting || !passwordLengthValid || !passwordsMatch
                }
              >
                {submitting ? 'Updating...' : 'Update password'}
              </Button>
            </form>
            <Button asChild variant="outline" size="lg">
              <Link to={paths.login}>Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
