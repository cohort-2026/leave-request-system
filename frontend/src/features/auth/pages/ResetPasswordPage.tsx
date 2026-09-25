import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { resetPassword } from '../api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState(
    token ? '' : 'This reset link is invalid or has expired.',
  )
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!token) {
      setFormError('This reset link is invalid or has expired.')
      return
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
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
    <PageShell title="Reset password" eyebrow="Public">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      {token ? (
        <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={submitting}
          />
          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={submitting}
          />
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      ) : null}
      <p>
        <Link to={paths.forgotPassword}>Request a new reset link</Link>
      </p>
      <p>
        <Link to={paths.login}>Back to sign in</Link>
      </p>
    </PageShell>
  )
}
