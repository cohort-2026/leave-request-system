import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import {
  Alert,
  AlertDescription,
} from '../../../components/ui/alert'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Separator } from '../../../components/ui/separator'
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

const cardClass = 'shadow-sm [--card-spacing:--spacing(6)]!'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

type FieldProps = {
  label: string
  name: string
} & Omit<ComponentProps<typeof Input>, 'id' | 'name'>

function Field({ label, name, ...props }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  )
}

function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const variant =
    tone === 'error' ? 'destructive' : tone === 'success' ? 'success' : 'default'
  return (
    <Alert variant={variant} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Card className={cardClass}>
          <CardContent className="flex items-center gap-4">
            <Avatar size="lg" className="data-[size=lg]:size-16">
              <AvatarFallback className="bg-accent! text-lg! font-medium text-accent-foreground">
                {initials(session.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground">
                {session.displayName}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {session.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {roleLabel[session.role]}
                {session.companyName ? ` · ${session.companyName}` : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleDetails}>
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                Your display name is the only detail you can change.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {detailsError ? <Notice tone="error">{detailsError}</Notice> : null}
              {detailsMessage ? (
                <Notice tone="success">{detailsMessage}</Notice>
              ) : null}
              <Field
                label="Display name"
                name="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={savingDetails}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Email"
                  name="email"
                  value={session.email}
                  readOnly
                  className="text-muted-foreground"
                />
                <Field
                  label="Role"
                  name="role"
                  value={roleLabel[session.role]}
                  readOnly
                  className="text-muted-foreground"
                />
                <Field
                  label="Company"
                  name="company"
                  value={session.companyName ?? 'None'}
                  readOnly
                  data-company-id={session.companyId ?? ''}
                  className="text-muted-foreground"
                />
                <Field
                  label="Status"
                  name="status"
                  value={statusLabel[session.status]}
                  readOnly
                  className="text-muted-foreground"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={savingDetails}>
                {savingDetails ? 'Saving…' : 'Save display name'}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handlePassword}>
          <Card className={cardClass}>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Use at least 8 characters. You stay signed in after changing it.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {passwordError ? (
                <Notice tone="error">{passwordError}</Notice>
              ) : null}
              {passwordMessage ? (
                <Notice tone="success">{passwordMessage}</Notice>
              ) : null}
              <Field
                label="Current password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={savingPassword}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="New password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  disabled={savingPassword}
                />
                <Field
                  label="Confirm new password"
                  name="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  disabled={savingPassword}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Updating…' : 'Change password'}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle>Authenticator</CardTitle>
            <CardDescription>
              Google Authenticator protects your sign-in with a 6-digit code.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {totpError ? <Notice tone="error">{totpError}</Notice> : null}
            {totpMessage ? <Notice tone="success">{totpMessage}</Notice> : null}

            {recoveryCodes.length > 0 ? (
              <>
                <Notice tone="info">
                  Store these recovery codes somewhere safe. Each code works once
                  if you lose the authenticator. They will not be shown again.
                </Notice>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {recoveryCodes.map((item) => (
                    <li key={item}>
                      <code className="block rounded-md bg-muted px-2.5 py-1.5 font-mono text-sm">
                        {item}
                      </code>
                    </li>
                  ))}
                </ul>
                <div>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setRecoveryCodes([])}
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : null}

            {enrollment && recoveryCodes.length === 0 ? (
              <form className="grid gap-4" onSubmit={handleEnroll}>
                <Notice tone="info">
                  Your previous authenticator was removed. Scan this QR with
                  Google Authenticator to set up a new one. If you cannot scan,
                  type the secret by hand.
                </Notice>
                <div
                  role="img"
                  aria-label="Authenticator QR code"
                  className="w-fit max-w-48 rounded-lg border bg-white p-3"
                  dangerouslySetInnerHTML={{ __html: enrollment.qrSvg }}
                />
                <Field
                  label="Secret"
                  name="totp-secret"
                  value={enrollment.secret}
                  readOnly
                  className="font-mono text-muted-foreground"
                />
                <Field
                  label="6-digit code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                  required
                  disabled={totpBusy}
                />
                <div>
                  <Button type="submit" disabled={totpBusy}>
                    {totpBusy ? 'Confirming…' : 'Confirm authenticator'}
                  </Button>
                </div>
              </form>
            ) : null}

            {!enrollment && recoveryCodes.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Resetting Google Authenticator requires an email confirmation.
                  Your current authenticator keeps working until you open the
                  link.
                </p>
                <div>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={totpBusy}
                    onClick={() => void handleTotpResetRequest()}
                  >
                    {totpBusy ? 'Sending…' : 'Email authenticator reset link'}
                  </Button>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Open <a href="http://localhost:8025">Mailpit</a> to read the
                  link in local development.
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
