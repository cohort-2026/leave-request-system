import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import {
  confirmTotpReset,
  isTotpEnrollment,
  type TotpEnrollmentChallenge,
} from '../api'

const inflight = new Map<
  string,
  Promise<TotpEnrollmentChallenge | { ok: true; totpReset: true }>
>()

function confirmTotpResetOnce(token: string) {
  const existing = inflight.get(token)
  if (existing) {
    return existing
  }
  const pending = confirmTotpReset(token)
  inflight.set(token, pending)
  pending.catch(() => {
    inflight.delete(token)
  })
  return pending
}

export function ResetAuthenticatorPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [state, setState] = useState<'idle' | 'working' | 'ok' | 'error'>(
    token ? 'working' : 'idle',
  )
  const [message, setMessage] = useState(
    token ? '' : 'This authenticator reset link is invalid or has expired.',
  )

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false
    setState('working')

    confirmTotpResetOnce(token)
      .then((result) => {
        if (cancelled) return
        if (isTotpEnrollment(result)) {
          navigate(paths.profile, { replace: true })
          return
        }
        setState('ok')
        setMessage('Authenticator removed. Sign in to set up a new one.')
      })
      .catch((error) => {
        if (cancelled) return
        setState('error')
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'This authenticator reset link is invalid or has expired.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token, navigate])

  if (loading) {
    return null
  }

  return (
    <PageShell title="Reset authenticator" eyebrow="Public">
      {state === 'ok' ? <Alert>{message}</Alert> : null}
      {state === 'error' || (state === 'idle' && message) ? (
        <Alert tone="error">{message}</Alert>
      ) : null}
      {state === 'working' ? (
        <Alert>Confirming authenticator reset…</Alert>
      ) : null}

      {state === 'ok' ? (
        <p>
          {session ? (
            <Link to={paths.profile}>Go to profile</Link>
          ) : (
            <Link to={paths.login}>Sign in</Link>
          )}
        </p>
      ) : null}
      {state === 'error' || state === 'idle' ? (
        <p>
          {session ? (
            <Link to={paths.profile}>Back to profile</Link>
          ) : (
            <Link to={paths.login}>Back to sign in</Link>
          )}
        </p>
      ) : null}
    </PageShell>
  )
}
