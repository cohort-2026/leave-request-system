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
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setFormError('')
    setSubmitting(true)

    try {
      const result = await forgotPassword(email)
      setMessage(
        result.message ??
          'If that email is registered, we sent a reset link.',
      )
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
    <PageShell title="Forgot password" eyebrow="Public">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        aria-busy={submitting}
      >
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
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="auth-help">
        Open <a href="http://localhost:8025">Mailpit</a> to read the link in
        local development.
      </p>
      <p className="auth-footer">
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}
