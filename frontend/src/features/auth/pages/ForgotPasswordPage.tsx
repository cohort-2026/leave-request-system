import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { requestPasswordReset, resetPassword } from '../api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      if (!codeSent) {
        await requestPasswordReset(email)
        setCodeSent(true)
        setMessage('Check your email for a six-digit reset code.')
      } else {
        await resetPassword(email, code, password)
        navigate(paths.login, { replace: true })
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to complete password recovery. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Reset your password" eyebrow="Account recovery">
      <p>
        {codeSent
          ? 'Enter the code from your email and choose a new password.'
          : 'Enter your account email and we will send a six-digit reset code.'}
      </p>
      {message ? <Alert>{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={submitting || codeSent}
        />
        {codeSent ? (
          <>
            <TextField
              label="Reset code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              required
              disabled={submitting}
            />
            <TextField
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={submitting}
            />
          </>
        ) : null}
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : codeSent ? 'Set new password' : 'Send reset code'}
        </Button>
      </form>
      <p>
        Remember your password? <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}