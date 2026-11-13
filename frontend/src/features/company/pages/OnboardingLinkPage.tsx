import { useEffect, useState } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Alert } from '../../../shared/components'
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
      <div className="grid max-w-3xl gap-4">
        <Alert tone="info">
          This link is the fallback when SCIM or SSO is off. The URL is only
          revealed when you create or replace it.
        </Alert>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>Company invite link</CardTitle>
                <CardDescription>
                  Manage the link employees use to join your company.
                </CardDescription>
              </div>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {loading ? 'Loading' : active ? 'Active' : 'Disabled'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4">
            {loading ? (
              <p className="text-sm text-muted-foreground" role="status">
                Loading invite link…
              </p>
            ) : (
              <>
                <p className="text-sm leading-6 text-muted-foreground">
                  {statusText}
                </p>
                <label
                  className="grid gap-2 text-sm font-medium"
                  htmlFor="inviteUrl"
                >
                  Invitation URL
                  <Input
                    id="inviteUrl"
                    name="inviteUrl"
                    value={url ?? ''}
                    placeholder={
                      active
                        ? 'Create or replace the link to see the URL'
                        : 'No active invite link'
                    }
                    readOnly
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleCopy}
                    disabled={!url || busy}
                  >
                    {copied ? 'Copied!' : 'Copy URL'}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleDisable}
                    disabled={!active || busy}
                  >
                    Disable link
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleReplace}
                    disabled={busy}
                  >
                    {active ? 'Replace link' : 'Create invite link'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
