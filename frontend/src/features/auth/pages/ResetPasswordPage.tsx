import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { resetPassword } from '../api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const token = searchParams.get('token') ?? ''

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }
    if (!token) {
      setFormError('This reset link is missing its token.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      navigate(paths.login, { replace: true, state: { passwordReset: true } })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to reset your password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Choose a new password" eyebrow="Account access">
      <p className="auth-lede">Use a password you&apos;ll be comfortable using every day.</p>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <form className="auth-form flex flex-col gap-stack" onSubmit={handleSubmit}>
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
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Updating password…' : 'Update password'}
        </Button>
      </form>
      <p className="auth-switch"><Link to={paths.login}>Back to sign in</Link></p>
    </PageShell>
  )
}
