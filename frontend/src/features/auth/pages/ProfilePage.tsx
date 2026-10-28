import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { roleLabel } from '../../../shared/types/session'
import {
  changePassword,
  confirmSignedInTotpEnroll,
  getTotpEnrollment,
  requestTotpReset,
  updateMe,
  type TotpEnrollmentChallenge,
} from '../api'

const statusLabel = {
  active: 'Active',
  pending_verification: 'Pending verification',
  pending_approval: 'Pending approval',
} as const

export function ProfilePage() {
  const { session, signIn } = useAuth()
  const [displayName, setDisplayName] = useState(session?.displayName ?? '')
  const [detailsMessage, setDetailsMessage] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [enrollment, setEnrollment] = useState<TotpEnrollmentChallenge | null>(
    null,
  )
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [totpCode, setTotpCode] = useState('')
  const [totpMessage, setTotpMessage] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)

  useEffect(() => {
    if (session) {
      setDisplayName(session.displayName)
    }
  }, [session])

  useEffect(() => {
    let cancelled = false
    getTotpEnrollment()
      .then((pending) => {
        if (!cancelled) {
          setEnrollment(pending)
        }
      })
      .catch((error) => {
        if (cancelled) return
        if (!(error instanceof ApiError) || error.status !== 404) {
          setTotpError(
            error instanceof ApiError
              ? error.message
              : 'Unable to load authenticator enrollment.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!session) {
    return <Navigate to={paths.login} replace />
  }

  async function handleDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDetailsError('')
    setDetailsMessage('')
    setSavingDetails(true)
    try {
      const next = await updateMe(displayName)
      signIn(next)
      setDetailsMessage('Display name saved.')
    } catch (error) {
      setDetailsError(
        error instanceof ApiError
          ? error.message
          : 'Unable to save your display name.',
      )
    } finally {
      setSavingDetails(false)
    }
  }

  async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password updated. You are still signed in.')
    } catch (error) {
      setPasswordError(
        error instanceof ApiError
          ? error.message
          : 'Unable to change your password.',
      )
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleTotpResetRequest() {
    setTotpError('')
    setTotpMessage('')
    setTotpBusy(true)
    try {
      const result = await requestTotpReset()
      setTotpMessage(
        result.message ??
          'Check your inbox (Mailpit in local dev) for a link to reset your authenticator.',
      )
    } catch (error) {
      setTotpError(
        error instanceof ApiError
          ? error.message
          : 'Unable to send the authenticator reset email.',
      )
    } finally {
      setTotpBusy(false)
    }
  }

  async function handleEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTotpError('')
    setTotpMessage('')
    setTotpBusy(true)
    try {
      const { recoveryCodes: codes, ...nextSession } =
        await confirmSignedInTotpEnroll(totpCode)
      signIn(nextSession)
      setEnrollment(null)
      setTotpCode('')
      setRecoveryCodes(codes)
    } catch (error) {
      setTotpError(
        error instanceof ApiError
          ? error.message
          : 'Unable to confirm the authenticator.',
      )
    } finally {
      setTotpBusy(false)
    }
  }

  return (
    <PageShell title="Profile" eyebrow={roleLabel[session.role]}>
      <form className="flex flex-col gap-stack" onSubmit={handleDetails}>
        <h2>Details</h2>
        {detailsError ? <Alert tone="error">{detailsError}</Alert> : null}
        {detailsMessage ? <Alert>{detailsMessage}</Alert> : null}
        <TextField
          label="Display name"
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={savingDetails}
        />
        <TextField
          label="Email"
          name="email"
          value={session.email}
          readOnly
        />
        <TextField
          label="Role"
          name="role"
          value={roleLabel[session.role]}
          readOnly
        />
        <TextField
          label="Company"
          name="company"
          value={session.companyName ?? 'None'}
          readOnly
          data-company-id={session.companyId ?? ''}
        />
        <TextField
          label="Status"
          name="status"
          value={statusLabel[session.status]}
          readOnly
        />
        <Button variant="primary" type="submit" disabled={savingDetails}>
          {savingDetails ? 'Saving…' : 'Save display name'}
        </Button>
      </form>

      <form className="flex flex-col gap-stack" onSubmit={handlePassword}>
        <h2>Password</h2>
        {passwordError ? <Alert tone="error">{passwordError}</Alert> : null}
        {passwordMessage ? <Alert>{passwordMessage}</Alert> : null}
        <TextField
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          disabled={savingPassword}
        />
        <TextField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          disabled={savingPassword}
        />
        <TextField
          label="Confirm new password"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          disabled={savingPassword}
        />
        <Button variant="primary" type="submit" disabled={savingPassword}>
          {savingPassword ? 'Updating…' : 'Change password'}
        </Button>
      </form>

      <div className="flex flex-col gap-stack">
        <h2>Authenticator</h2>
        {totpError ? <Alert tone="error">{totpError}</Alert> : null}
        {totpMessage ? <Alert>{totpMessage}</Alert> : null}

        {recoveryCodes.length > 0 ? (
          <>
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
            <Button
              variant="secondary"
              type="button"
              onClick={() => setRecoveryCodes([])}
            >
              Done
            </Button>
          </>
        ) : null}

        {enrollment && recoveryCodes.length === 0 ? (
          <form className="flex flex-col gap-stack" onSubmit={handleEnroll}>
            <Alert>
              Your previous authenticator was removed. Scan this QR with Google
              Authenticator to set up a new one. If you cannot scan, type the
              secret by hand.
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
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              required
              disabled={totpBusy}
            />
            <Button variant="primary" type="submit" disabled={totpBusy}>
              {totpBusy ? 'Confirming…' : 'Confirm authenticator'}
            </Button>
          </form>
        ) : null}

        {!enrollment && recoveryCodes.length === 0 ? (
          <>
            <p>
              Resetting Google Authenticator requires an email confirmation.
              Your current authenticator keeps working until you open the link.
            </p>
            <Button
              variant="secondary"
              type="button"
              disabled={totpBusy}
              onClick={() => void handleTotpResetRequest()}
            >
              {totpBusy ? 'Sending…' : 'Email authenticator reset link'}
            </Button>
            <p>
              Open <a href="http://localhost:8025">Mailpit</a> to read the link
              in local development.
            </p>
          </>
        ) : null}
      </div>
    </PageShell>
  )
}
