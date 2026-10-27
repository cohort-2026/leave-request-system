import { useEffect, useState } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import {
  createOnboardingLink,
  disableOnboardingLink,
  getOnboardingLink,
} from './onboardingLinkApi'

function formatCreatedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

export function OnboardingLinkPage() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    getOnboardingLink()
      .then((link) => {
        if (cancelled) return
        setActive(link.active)
        setCreatedAt(link.createdAt)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load the invite link.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCopy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setError(null)
      setCopied(true)
      setNotice('Invite URL copied.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the invite URL.')
    }
  }

  async function handleDisable() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await disableOnboardingLink()
      setActive(false)
      setCreatedAt(null)
      setUrl(null)
      setCopied(false)
      setNotice('Invite link disabled.')
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not disable the invite link.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleReplace() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const created = await createOnboardingLink()
      setActive(true)
      setCreatedAt(created.createdAt)
      setUrl(created.url)
      setCopied(false)
      setNotice(
        'Copy this URL now. It is only shown when you create or replace the link.',
      )
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not create the invite link.',
      )
    } finally {
      setBusy(false)
    }
  }

  const statusText = active
    ? createdAt
      ? `An invite link is active (created ${formatCreatedAt(createdAt)}). The URL is only shown when you create or replace it.`
      : 'An invite link is active. The URL is only shown when you create or replace it.'
    : 'No active invite link.'

  return (
    <PageShell title="Invite link" eyebrow="Company admin">
      <Alert tone="info">
        This link is the fallback when SCIM or SSO is off.
      </Alert>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {loading ? (
        <p className="muted">Loading invite link…</p>
      ) : (
        <>
          <p className="muted">{statusText}</p>
          <TextField
            label="Invitation URL"
            name="inviteUrl"
            value={url ?? ''}
            placeholder={
              active
                ? 'Create or replace the link to see the URL'
                : 'No active invite link'
            }
            readOnly
          />
          <div className="flex gap-stack">
            <Button
              variant="primary"
              type="button"
              onClick={handleCopy}
              disabled={!url || busy}
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={handleDisable}
              disabled={!active || busy}
            >
              Disable link
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleReplace}
              disabled={busy}
            >
              {active ? 'Replace link' : 'Create invite link'}
            </Button>
          </div>
        </>
      )}
    </PageShell>
  )
}
