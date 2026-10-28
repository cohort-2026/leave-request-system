import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  startCompanySso,
  type TotpEnrollmentChallenge,
} from '../api'

type Step = 'password' | 'enroll' | 'totp' | 'recoveryCodes'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<Step>('password')
  const [resetNotice] = useState(
    Boolean(
      (location.state as { passwordReset?: unknown } | null)?.passwordReset,
    ),
  )
  const [email, setEmail] = useState('')
  const [ssoIdentifier, setSsoIdentifier] = useState('')
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
  const [ssoSubmitting, setSsoSubmitting] = useState(false)
  const [ssoError, setSsoError] = useState('')

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

  async function handleSso(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSsoError('')
    setSsoSubmitting(true)

    try {
      const result = await startCompanySso(ssoIdentifier.trim())
      if (!result.authorizationUrl) {
        setSsoError('Company SSO is unavailable. Use password sign-in instead.')
        return
      }
      window.location.assign(result.authorizationUrl)
    } catch (error) {
      setSsoError(
        error instanceof ApiError && (error.status === 404 || error.status === 503)
          ? 'Company SSO is not available yet. Use password sign-in instead.'
          : error instanceof ApiError
            ? error.message
          : 'Company SSO is unavailable. Use password sign-in instead.',
      )
    } finally {
      setSsoSubmitting(false)
    }
  }

  async function handleEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const { recoveryCodes: codes, ...nextSession } =
        await confirmTotpEnroll(email, code)
      setRecoveryCodes(codes)
      setPendingSession(nextSession)
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
      {resetNotice && step === 'password' ? (
        <Alert tone="success">Password updated. You can sign in.</Alert>
      ) : null}
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {step === 'password' ? (
        <>
          <form
            className="auth-form"
            onSubmit={handleSso}
            aria-busy={ssoSubmitting}
          >
            {ssoError ? <Alert tone="error">{ssoError}</Alert> : null}
            <TextField
              label="Company slug or work email"
              name="sso-identifier"
              autoComplete="organization"
              placeholder="acme or you@acme.com"
              value={ssoIdentifier}
              onChange={(event) => setSsoIdentifier(event.target.value)}
              required
              disabled={ssoSubmitting}
            />
            <Button variant="secondary" type="submit" disabled={ssoSubmitting}>
              {ssoSubmitting ? 'Connecting…' : 'Sign in with company SSO'}
            </Button>
          </form>
          <p className="auth-help">Or sign in with your password</p>
          <form
            className="auth-form"
            onSubmit={handlePassword}
            aria-busy={submitting}
          >
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
            <div className="auth-inline-action">
              <Link to={paths.forgotPassword}>Forgot password?</Link>
            </div>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Log in'}
            </Button>
          </form>
        </>
      ) : null}

      {step === 'enroll' && enrollment ? (
        <form
          className="auth-form"
          onSubmit={handleEnroll}
          aria-busy={submitting}
        >
          <Alert>
            {enrollment.totpReset
              ? 'Your previous authenticator was removed. Scan this QR with Google Authenticator to set up a new one. If you cannot scan, type the secret by hand.'
              : 'Scan this QR code with Google Authenticator (or any TOTP app). If you cannot scan, type the secret by hand.'}
          </Alert>
          <div
            role="img"
            aria-label="Authenticator QR code"
            className="auth-qr"
            dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
          />
          <TextField
            label="Secret"
            name="totp-secret"
            value={enrollment.secret}
            hint="Type this into the authenticator app if you cannot scan the QR."
            readOnly
          />
          <TextField
            label="6-digit code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            hint="Enter the code from Google Authenticator to confirm setup."
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
        <form
          className="auth-form"
          onSubmit={handleTotp}
          aria-busy={submitting}
        >
          {useRecovery ? (
            <>
              <Alert>
                Use a recovery code if you lost Google Authenticator. This
                removes the current authenticator so you can scan a new QR next.
              </Alert>
              <TextField
                label="Recovery code"
                name="recoveryCode"
                autoComplete="off"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                hint="Each recovery code works once."
                required
                disabled={submitting}
              />
            </>
          ) : (
            <>
              <Alert>
                Open Google Authenticator and enter the 6-digit code for this
                account.
              </Alert>
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
            </>
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
          <p className="auth-inline-action">
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
        <div className="auth-form">
          <Alert>
            Store these recovery codes somewhere safe. Each code works once if
            you lose the authenticator. They will not be shown again.
          </Alert>
          <ul className="auth-recovery-codes">
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
        <p className="auth-footer">
          <Link to={paths.verify} state={{ email }}>
            Verify your email or request a new link
          </Link>
        </p>
      ) : null}
      {step === 'password' ? (
        <div className="auth-footer">
          <p>
            Don&apos;t have an account? <Link to={paths.register}>Register</Link>
          </p>
          <p>
            <Link to={paths.startCompany}>Start your company</Link>
          </p>
          <p className="auth-help">
            Have an invite? Open the link from your admin.
          </p>
        </div>
      ) : null}
    </PageShell>
  )
}
