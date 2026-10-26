import React, { useState } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'

let mockLinkStorage = {
  token: 'fallback_token_2026_xyz',
  isEnabled: true,
}

export function OnboardingLinkPage() {
  const [token, setToken] = useState(mockLinkStorage.token)
  const [isEnabled, setIsEnabled] = useState(mockLinkStorage.isEnabled)
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${window.location.origin}/onboard/${token}`

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisableLink = () => {
    mockLinkStorage.isEnabled = false
    setIsEnabled(false)
  }

  const handleReplaceLink = () => {
    const freshToken = `fallback_${Math.random().toString(36).substring(2, 11)}`
    mockLinkStorage.token = freshToken
    mockLinkStorage.isEnabled = true
    setToken(freshToken)
    setIsEnabled(true)
  }

  return (
    <PageShell title="Onboarding link" eyebrow="Admin">
      <div className="mb-4">
        <Alert tone="info">
          This link serves as the manual fallback option when standard SCIM or Single Sign-On (SSO) provisioning is turned off.
        </Alert>
      </div>

      <div className="flex gap-4 items-end my-4 max-w-xl">
        <div className="flex-1">
          <TextField
            label="Invitation URL"
            name="inviteUrl"
            value={isEnabled ? inviteUrl : 'Invite link disabled'}
            readOnly
          />
        </div>
        <Button variant="primary" type="button" onClick={handleCopyUrl} disabled={!isEnabled}>
          {copied ? 'Copied!' : 'Copy URL'}
        </Button>
      </div>

      <div className="flex gap-stack mt-6">
        <Button variant="secondary" type="button" onClick={handleDisableLink} disabled={!isEnabled}>
          Disable link
        </Button>
        <Button variant="primary" type="button" onClick={handleReplaceLink}>
          Replace link
        </Button>
      </div>
    </PageShell>
  )
}

export function AdminImportStub() {
  return (
    <PageShell title="CSV Member import" eyebrow="Admin">
      <p className="muted">CSV infrastructure recovery pipelines are out of scope for this task execution lifecycle.</p>
    </PageShell>
  )
}

