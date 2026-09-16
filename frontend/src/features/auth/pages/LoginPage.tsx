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
  const [useRecovery, setUseRecovery] = useState(false)
  const [enrollment, setEnrollment] = useState<TotpEnrollmentChallenge | null>(
    null,
  )
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [pendingSession, setPendingSession] = useState<Session | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
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
    setUseRecovery(false)
    setEnrollment(null)
    setFormError('')
    setNeedsVerify(false)
    setErrors({})
  }

  async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setNeedsVerify(false)
    setSubmitting(true)

    try {
      const result = await login(email, password)
      if ('totpEnrollmentRequired' in result && result.totpEnrollmentRequired) {
        setEnrollment(result)
        setStep('enroll')
        return
      }
      setEnrollment(null)
      setUseRecovery(false)
      setCode('')
      setRecoveryCode('')
      setStep('totp')
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setFormError(error.message)
        setNeedsVerify(error.status === 403)
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
      if (useRecovery) {
        const reset = await verifyTotpRecovery(email, recoveryCode.trim())
        setEnrollment(reset)
        setCode('')
        setRecoveryCode('')
        setUseRecovery(false)
        setStep('enroll')
        return
      }
      const session = await verifyTotpLogin(email, code)
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
      ? enrollment?.totpReset
        ? 'Replace authenticator'
        : 'Set up authenticator'
      : step === 'totp'
        ? useRecovery
          ? 'Recovery code'
          : 'Authenticator code'
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
            {enrollment.totpReset
              ? 'Your previous authenticator was removed. Scan this QR with Google Authenticator to set up a new one. If you cannot scan, type the secret by hand.'
              : 'Scan this QR code with Google Authenticator (or any TOTP app). If you cannot scan, type the secret by hand.'}
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
          {useRecovery ? (
            <>
              <Alert>
                Use this if you lost Google Authenticator. It removes the
                current authenticator so you can scan a new QR next.
              </Alert>
              <TextField
                label="Recovery code"
                name="recoveryCode"
                autoComplete="off"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                required
                disabled={submitting}
              />
            </>
          ) : (
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
          )}
          <Button
            variant="primary"
            type="submit"
            disabled={
              submitting ||
              (useRecovery ? !recoveryCode.trim() : !code.trim())
            }
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </Button>
          <p>
            {useRecovery ? (
              <a
                href="#authenticator"
                onClick={(event) => {
                  event.preventDefault()
                  if (submitting) return
                  setUseRecovery(false)
                  setRecoveryCode('')
                  setFormError('')
                }}
              >
                Use authenticator code?
              </a>
            ) : (
              <a
                href="#recovery"
                onClick={(event) => {
                  event.preventDefault()
                  if (submitting) return
                  setUseRecovery(true)
                  setCode('')
                  setFormError('')
                }}
              >
                Use recovery code?
              </a>
            )}
          </p>
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

      {step === 'password' && needsVerify ? (
        <p>
          <Link to={paths.verify} state={{ email }}>
            Verify your email or request a new link
          </Link>
        </p>
      ) : null}
      {step === 'password' ? (
        <p>
          Don&apos;t have an account? <Link to={paths.register}>Register</Link>
        </p>
      ) : null}
    </PageShell>
  )
}
