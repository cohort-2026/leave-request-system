import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { onboardPath, paths } from '../../../shared/constants/paths'

function getInviteToken(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(/^\/onboard\/([^/]+)$/)
    return match?.[1] ?? null
  } catch {
    return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : null
  }
}

export function JoinInvitePage() {
  const navigate = useNavigate()
  const [invite, setInvite] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getInviteToken(invite)

    if (!token) {
      setError('Enter the organisation invite link or invite token from your administrator.')
      return
    }

    setError('')
    navigate(onboardPath(token))
  }

  return (
    <PageShell title="Join your organisation" eyebrow="Organisation invite">
      <p className="auth-lede">
        Paste the invite link sent by your organisation administrator to continue.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form className="auth-form flex flex-col gap-stack" onSubmit={handleSubmit}>
        <TextField
          label="Invite link or token"
          name="invite"
          type="text"
          autoComplete="off"
          placeholder="https://app.example.com/onboard/your-token"
          value={invite}
          onChange={(event) => setInvite(event.target.value)}
          required
        />
        <Button variant="primary" type="submit">
          Continue with invite
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to={paths.login}>Sign in</Link>
      </p>
    </PageShell>
  )
}
