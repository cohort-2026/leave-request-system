import { useEffect, useState } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import { getSsoSettings, saveSsoSettings } from '../api'

const emptySettings = {
  issuer: '',
  clientId: '',
  emailDomain: '',
  enabled: false,
  clientSecretConfigured: false,
}

export function SsoSettingsPage() {
  const [settings, setSettings] = useState(emptySettings)
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    getSsoSettings()
      .then((result) => {
        if (active) {
          setSettings({
            issuer: result.issuer ?? '',
            clientId: result.clientId ?? '',
            emailDomain: result.emailDomain ?? '',
            enabled: result.enabled ?? false,
            clientSecretConfigured: result.clientSecretConfigured ?? false,
          })
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError &&
              (loadError.status === 404 || loadError.status === 503)
              ? 'The company SSO settings API is not available yet.'
              : loadError instanceof ApiError
                ? loadError.message
              : 'Unable to load company SSO settings.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const saved = await saveSsoSettings({
        issuer: settings.issuer.trim(),
        clientId: settings.clientId.trim(),
        emailDomain: settings.emailDomain.trim().replace(/^@/, ''),
        enabled: settings.enabled,
        ...(clientSecret ? { clientSecret } : {}),
      })
      setSettings({
        issuer: saved.issuer ?? settings.issuer,
        clientId: saved.clientId ?? settings.clientId,
        emailDomain: saved.emailDomain ?? settings.emailDomain,
        enabled: saved.enabled ?? settings.enabled,
        clientSecretConfigured:
          saved.clientSecretConfigured ??
          (Boolean(clientSecret) || settings.clientSecretConfigured),
      })
      setClientSecret('')
      setNotice('SSO settings saved.')
    } catch (saveError) {
      setError(
        saveError instanceof ApiError &&
          (saveError.status === 404 || saveError.status === 503)
          ? 'The company SSO settings API is not available yet. Settings were not saved.'
          : saveError instanceof ApiError
            ? saveError.message
          : 'Unable to save company SSO settings. Try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Company SSO" eyebrow="Company admin">
      <p className="muted">
        Connect your company identity provider using OpenID Connect.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <form className="auth-form" onSubmit={handleSave} aria-busy={saving || loading}>
        <TextField
          label="Issuer URL"
          name="sso-issuer"
          type="url"
          autoComplete="url"
          value={settings.issuer}
          onChange={(event) =>
            setSettings((current) => ({ ...current, issuer: event.target.value }))
          }
          placeholder="https://identity.example.com"
          required={settings.enabled}
          disabled={loading || saving}
        />
        <TextField
          label="Client ID"
          name="sso-client-id"
          autoComplete="off"
          value={settings.clientId}
          onChange={(event) =>
            setSettings((current) => ({ ...current, clientId: event.target.value }))
          }
          required={settings.enabled}
          disabled={loading || saving}
        />
        <TextField
          label="Client secret"
          name="sso-client-secret"
          type="password"
          autoComplete="new-password"
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          hint={
            settings.clientSecretConfigured
              ? 'A secret is saved. Leave blank to keep it, or enter a new value to replace it.'
              : 'The secret is write-only and will not be shown after saving.'
          }
          required={settings.enabled && !settings.clientSecretConfigured}
          disabled={loading || saving}
        />
        <TextField
          label="Email domain"
          name="sso-email-domain"
          autoComplete="off"
          value={settings.emailDomain}
          onChange={(event) =>
            setSettings((current) => ({ ...current, emailDomain: event.target.value }))
          }
          placeholder="example.com"
          hint="Used to match work email addresses to this company."
          required={settings.enabled}
          disabled={loading || saving}
        />
        <label className="field">
          <span>Enable company SSO</span>
          <input
            name="sso-enabled"
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) =>
              setSettings((current) => ({ ...current, enabled: event.target.checked }))
            }
            disabled={loading || saving}
          />
        </label>
        <Button variant="primary" type="submit" disabled={loading || saving}>
          {loading ? 'Loading…' : saving ? 'Saving…' : 'Save SSO settings'}
        </Button>
      </form>
    </PageShell>
  )
}