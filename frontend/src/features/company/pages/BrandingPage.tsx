import { useEffect, useState } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { useCompanyBrand } from '../../../app/providers/CompanyBrandProvider'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Alert } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import { BrandPreview } from '../components/BrandPreview'
import {
  DEFAULT_BRAND_ACCENT,
  DEFAULT_BRAND_PRIMARY,
  removeCompanyLogo,
  saveCompanyBranding,
  uploadCompanyLogo,
} from '../brandingApi'
import { extractBrandColor } from '../extractBrandColor'

export function BrandingPage() {
  const { branding, logoSrc, refresh } = useCompanyBrand()
  const [slogan, setSlogan] = useState('')
  const [primary, setPrimary] = useState(DEFAULT_BRAND_PRIMARY)
  const [accent, setAccent] = useState(DEFAULT_BRAND_ACCENT)
  const [manual, setManual] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!branding) return
    setSlogan(branding.slogan ?? '')
    setPrimary(branding.brandPrimary || DEFAULT_BRAND_PRIMARY)
    setAccent(branding.brandAccent || DEFAULT_BRAND_ACCENT)
    setManual(branding.brandColorsManual)
    setLogoPreview(logoSrc)
  }, [branding, logoSrc])

  async function handleLogo(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      let nextPrimary = primary
      let nextAccent = accent
      if (!manual) {
        const extracted = await extractBrandColor(file)
        if (extracted) {
          nextPrimary = extracted
          nextAccent = extracted
          setPrimary(extracted)
          setAccent(extracted)
        }
      }
      const next = await uploadCompanyLogo(file)
      if (!manual && nextPrimary) {
        await saveCompanyBranding({
          slogan: slogan.trim() || null,
          brandPrimary: nextPrimary,
          brandAccent: nextAccent,
          brandColorsManual: false,
        })
      }
      await refresh()
      setLogoPreview(next.logoUrl)
      setNotice(
        manual
          ? 'Logo updated. Your chosen colours were kept.'
          : 'Logo updated. Brand colour was taken from the logo.',
      )
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Could not upload that logo.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await saveCompanyBranding({
        slogan: slogan.trim() || null,
        brandPrimary: primary,
        brandAccent: accent,
        brandColorsManual: true,
      })
      setManual(true)
      await refresh()
      setNotice('Appearance saved.')
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Could not save appearance.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveLogo() {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await removeCompanyLogo()
      await refresh()
      setLogoPreview(null)
      setNotice('Logo removed.')
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Could not remove the logo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell title="Appearance">
      <p className="max-w-2xl text-muted-foreground">
        Add your company logo and colours. They show in the top bar and on Home
        for everyone in this workspace.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          className="grid max-w-xl gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <label className="grid gap-1 text-sm font-medium">
            Slogan
            <Input
              value={slogan}
              onChange={(event) => setSlogan(event.target.value)}
              placeholder="Leave that is easy to follow"
              maxLength={120}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Logo
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void handleLogo(event.target.files?.[0])}
              disabled={busy}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Brand colour
              <Input
                type="color"
                value={primary}
                onChange={(event) => {
                  setPrimary(event.target.value)
                  setManual(true)
                }}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Button hover
              <Input
                type="color"
                value={accent}
                onChange={(event) => {
                  setAccent(event.target.value)
                  setManual(true)
                }}
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            Uploading a logo picks a colour from it unless you have already
            chosen colours here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save appearance'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !logoPreview}
              onClick={() => void handleRemoveLogo()}
            >
              Remove logo
            </Button>
          </div>
        </form>
        <BrandPreview
          companyName={branding?.name ?? ''}
          slogan={slogan}
          primary={primary}
          logoUrl={logoPreview}
        />
      </div>
    </PageShell>
  )
}
