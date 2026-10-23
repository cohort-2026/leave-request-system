import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { register } from '../api'

const MIN_PASSWORD_LENGTH = 8
const PASSWORD_TOO_SHORT = 'Password must be at least 8 characters'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' })
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrors({ password: `${PASSWORD_TOO_SHORT}.` })
      return
    }

    setSubmitting(true)

    try {
      await register(email, password)
      navigate(paths.verify, { replace: true, state: { email } })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 && error.message === PASSWORD_TOO_SHORT) {
          setErrors({ ...error.fieldErrors, password: error.message })
        } else {
          setErrors(error.fieldErrors)
          setFormError(error.message)
        }
      } else {
        setFormError('Unable to register. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Register" eyebrow="Public">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
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
          error={errors.email}
          required
          disabled={submitting}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint="Must be at least 8 characters."
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
          error={errors.confirmPassword}
          required
          disabled={submitting}
        />
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? 'Registering…' : 'Register'}
        </Button>
      </form>
      <p className="auth-footer">
        Already have an account? <Link to={paths.login}>Sign in</Link>
      </p>
    </PageShell>
  )
}
