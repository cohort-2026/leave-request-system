import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_BRAND_ACCENT,
  DEFAULT_BRAND_PRIMARY,
  getCompanyBranding,
  type CompanyBranding,
} from '../../features/company/brandingApi'
import { useAuth } from './useAuth'

type BrandContextValue = {
  branding: CompanyBranding | null
  logoSrc: string | null
  refresh: () => Promise<void>
}

const BrandContext = createContext<BrandContextValue>({
  branding: null,
  logoSrc: null,
  refresh: async () => {},
})

function applyBrand(primary: string, accent: string) {
  const root = document.documentElement
  root.style.setProperty('--primary', primary)
  root.style.setProperty('--primary-hover', accent)
  root.style.setProperty('--ring', primary)
  root.style.setProperty('--sidebar-primary', primary)
  root.style.setProperty('--sidebar-ring', primary)
  root.style.setProperty('--chart-1', primary)
}

function clearBrand() {
  const root = document.documentElement
  for (const name of [
    '--primary',
    '--primary-hover',
    '--ring',
    '--sidebar-primary',
    '--sidebar-ring',
    '--chart-1',
  ]) {
    root.style.removeProperty(name)
  }
}

export function CompanyBrandProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [branding, setBranding] = useState<CompanyBranding | null>(null)
  const [logoRevision, setLogoRevision] = useState(0)

  const refresh = useCallback(async () => {
    if (!session?.companyId) {
      setBranding(null)
      clearBrand()
      return
    }
    try {
      const next = await getCompanyBranding()
      setBranding(next)
      setLogoRevision((value) => value + 1)
      applyBrand(
        next.brandPrimary || DEFAULT_BRAND_PRIMARY,
        next.brandAccent || DEFAULT_BRAND_ACCENT,
      )
    } catch {
      setBranding(null)
      clearBrand()
    }
  }, [session?.companyId])

  useEffect(() => {
    void refresh()
    return () => {
      clearBrand()
    }
  }, [refresh])

  const logoSrc =
    branding?.hasLogo && branding.id
      ? `/api/companies/current/logo?c=${branding.id}&r=${logoRevision}`
      : null

  const value = useMemo(
    () => ({ branding, logoSrc, refresh }),
    [branding, logoSrc, refresh],
  )

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useCompanyBrand() {
  return useContext(BrandContext)
}
