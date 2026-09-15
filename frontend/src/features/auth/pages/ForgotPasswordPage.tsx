import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { forgotPassword } from '../api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setResetUrl('')
    setFormError('')
    setSubmitting(true)

    try {
      const response = await forgotPassword(email)
      setMessage(response.message)
      if (response.resetUrl) setResetUrl(response.resetUrl)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to create a reset link. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Reset your password" eyebrow="Account access">
      <p className="auth-lede">Enter your email and we&apos;ll help you get back in.</p>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {resetUrl ? (
        <p className="reset-link-preview">
          <strong>Development reset link</strong>
          <Link to={resetUrl}>Continue to choose a new password</Link>
        </p>
      ) : null}
      <form className="auth-form flex flex-col gap-stack" onSubmit={handleSubmit}>
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating link…' : 'Send reset link'}
        </Button>
      </form>
      <p className="auth-switch"><Link to={paths.login}>Back to sign in</Link></p>
    </PageShell>
  )
}
