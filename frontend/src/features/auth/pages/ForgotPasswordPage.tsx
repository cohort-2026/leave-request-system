import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '../../../components/ui/card'
import { Field, FieldLabel } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { forgotPassword } from '../api'

const GENERIC_SUCCESS_MESSAGE =
  'If that email is registered, we sent a reset link.'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setSubmitted(false)
    setSubmitting(true)

    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to send a reset email. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Forgot password">
      <Card className="gap-0 border-border/70 bg-card py-0 shadow-sm ring-1 ring-foreground/5">
        <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardDescription>
            Enter your email address. If an account is registered with it,
            we&apos;ll send a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {formError ? (
            <Alert variant="destructive">{formError}</Alert>
          ) : null}
          {submitted ? (
            <Alert aria-live="polite">{GENERIC_SUCCESS_MESSAGE}</Alert>
          ) : null}
          <form
            className="grid gap-4"
            onSubmit={handleSubmit}
            aria-busy={submitting}
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
                disabled={submitting}
              />
            </Field>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
          <Button asChild variant="outline" size="lg">
            <Link to={paths.login}>Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  )
}
