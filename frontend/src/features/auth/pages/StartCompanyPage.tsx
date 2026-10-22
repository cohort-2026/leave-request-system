import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { signupCompany } from '../api'

export function StartCompanyPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [displayName, setDisplayName] = useState('')
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

    setSubmitting(true)

    try {
      await signupCompany(companyName, displayName, email, password)
      navigate(paths.verify, { replace: true, state: { email } })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setFormError(
          error.status === 404 &&
            error.message === 'Something went wrong. Please try again.'
            ? 'Company signup is not available yet. Please try again later.'
            : error.message,
        )
      } else {
        setFormError('Unable to start your company. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="company-signup-layout">
      <PageShell title="Start your company" eyebrow="Workspace setup">
        <p className="company-signup-intro">
          Create your company workspace and set up your administrator account.
        </p>
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
          <TextField
            label="Company name"
            name="companyName"
            autoComplete="organization"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            error={errors.companyName}
            required
            disabled={submitting}
          />
          <TextField
            label="Your name"
            name="displayName"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            error={errors.displayName}
            required
            disabled={submitting}
          />
          <TextField
            label="Work email"
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
            {submitting ? 'Starting…' : 'Create company workspace'}
          </Button>
        </form>
        <p>
          Already have an account? <Link to={paths.login}>Sign in</Link>
        </p>
      </PageShell>
      <aside className="company-signup-aside" aria-label="Workspace setup">
        <p className="company-signup-aside-label">Built for your team</p>
        <h2>A clear start for better leave management.</h2>
        <p>
          Bring your team into one organized workspace, with the right tools for
          managing time away.
        </p>
        <ol className="company-signup-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Create your workspace</strong>
              <small>Tell us who you are and where you work.</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Verify your email</strong>
              <small>We’ll send a link to confirm your address.</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Secure your account</strong>
              <small>Finish setup with two-factor authentication.</small>
            </div>
          </li>
        </ol>
        <p className="company-signup-aside-footnote">
          Your company details stay with your workspace.
        </p>
      </aside>
    </div>
  )
}
