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
      setNotice('Invite link copied.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the invite link.')
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
      setNotice('Invite link turned off.')
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not turn off the invite link.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function mintLink(replaced: boolean) {
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
        replaced
          ? 'New invite link created. Copy it now — the previous link no longer works.'
          : 'Invite link created. Copy it now. You will not see this URL again after you leave this page.',
      )
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : replaced
            ? 'Could not replace the invite link.'
            : 'Could not create the invite link.',
      )
    } finally {
      setBusy(false)
    }
  }

  const statusText = active
    ? createdAt
      ? `People can join with the current invite link (created ${formatCreatedAt(createdAt)}).`
      : 'People can join with the current invite link.'
    : 'There is no invite link yet. Create one to let people join your company.'

  return (
    <PageShell title="Invite link">
      <div className="grid max-w-3xl gap-4">
        <p className="text-muted-foreground">
          Share this link with people who should join your company. After you
          create or replace it, copy the URL straight away — it is shown only
          once.
        </p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <CardTitle>Company invite link</CardTitle>
                <CardDescription>
                  One active link at a time. Replacing it turns the old one off.
                </CardDescription>
              </div>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {loading ? 'Loading' : active ? 'Active' : 'No link'}
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
                        ? 'Create a new link to see the URL again'
                        : 'Create a link to see the URL'
                    }
                    readOnly
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void mintLink(false)}
                    disabled={busy || active}
                  >
                    Create link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void mintLink(true)}
                    disabled={busy || !active}
                  >
                    Replace link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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
                    Turn off
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
