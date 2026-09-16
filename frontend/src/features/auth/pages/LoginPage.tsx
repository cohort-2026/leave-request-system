import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { homeFor, paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import type { Session } from '../../../shared/types/session'
import {
  confirmTotpEnroll,
  login,
  verifyTotpLogin,
  verifyTotpRecovery,
  type TotpEnrollmentChallenge,
} from '../api'

type Step = 'password' | 'enroll' | 'totp' | 'recoveryCodes'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [enrollment, setEnrollment] = useState<TotpEnrollmentChallenge | null>(
    null,
  )
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [pendingSession, setPendingSession] = useState<Session | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function goHome(session: Session) {
    signIn(session)
    if (session.status === 'pending_verification') {
      navigate(paths.verify, { replace: true })
      return
    }
    if (session.status === 'pending_approval') {
      navigate(paths.pendingApproval, { replace: true })
      return
    }
    navigate(homeFor(session.role), { replace: true })
  }

  function backToPassword() {
    setStep('password')
    setCode('')
    setRecoveryCode('')
    setEnrollment(null)
    setFormError('')
    setErrors({})
  }

  async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const result = await login(email, password)
      if ('totpEnrollmentRequired' in result && result.totpEnrollmentRequired) {
        setEnrollment(result)
        setStep('enroll')
        return
      }
      setEnrollment(null)
      setStep('totp')
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setFormError(error.message)
      } else {
        setFormError('Unable to sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const result = await confirmTotpEnroll(email, code)
      setRecoveryCodes(result.recoveryCodes)
      setPendingSession({
        displayName: result.displayName,
        role: result.role,
        status: result.status,
        companyName: result.companyName,
      })
      setStep('recoveryCodes')
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
      } else {
        setFormError('Unable to confirm the authenticator. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTotp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const trimmedRecovery = recoveryCode.trim()
      const session = trimmedRecovery
        ? await verifyTotpRecovery(email, trimmedRecovery)
        : await verifyTotpLogin(email, code)
      goHome(session)
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
      } else {
        setFormError('Unable to verify the authenticator code. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function finishRecoveryCodes() {
    if (!pendingSession) {
      return
    }
    goHome(pendingSession)
  }

  const title =
    step === 'enroll'
      ? 'Set up authenticator'
      : step === 'totp'
        ? 'Authenticator code'
        : step === 'recoveryCodes'
          ? 'Save recovery codes'
          : 'Sign in'

  return (
    <PageShell title={title} eyebrow="Public">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {step === 'password' ? (
        <form className="flex flex-col gap-stack" onSubmit={handlePassword}>
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            required
            disabled={submitting}
          />
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
      ) : null}

      {step === 'enroll' && enrollment ? (
        <form className="flex flex-col gap-stack" onSubmit={handleEnroll}>
          <Alert>
            Scan this QR code with Google Authenticator (or any TOTP app). If
            you cannot scan, type the secret by hand.
          </Alert>
          <div
            role="img"
            aria-label="Authenticator QR code"
            className="max-w-48"
            dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
          />
          <TextField
            label="Secret"
            name="totp-secret"
            value={enrollment.secret}
            readOnly
          />
          <TextField
            label="6-digit code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            disabled={submitting}
          />
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Confirming…' : 'Confirm authenticator'}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={submitting}
            onClick={backToPassword}
          >
            Back
          </Button>
        </form>
      ) : null}

      {step === 'totp' ? (
        <form className="flex flex-col gap-stack" onSubmit={handleTotp}>
          <TextField
            label="6-digit code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Recovery code"
            name="recoveryCode"
            autoComplete="off"
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value)}
            disabled={submitting}
          />
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || (!code.trim() && !recoveryCode.trim())}
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={submitting}
            onClick={backToPassword}
          >
            Back
          </Button>
        </form>
      ) : null}

      {step === 'recoveryCodes' ? (
        <div className="flex flex-col gap-stack">
          <Alert>
            Store these recovery codes somewhere safe. Each code works once if
            you lose the authenticator. They will not be shown again.
          </Alert>
          <ul>
            {recoveryCodes.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
          <Button variant="primary" type="button" onClick={finishRecoveryCodes}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === 'password' ? (
        <p>
          Don&apos;t have an account? <Link to={paths.register}>Register</Link>
        </p>
      ) : null}
    </PageShell>
  )
}
