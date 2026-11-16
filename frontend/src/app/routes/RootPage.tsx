import { Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { MarketingLayout } from '../layouts/MarketingLayout'
import { useAuth } from '../providers/useAuth'
import { HomePage } from '../../features/leave/pages/HomePage'
import { LandingPage } from '../../features/marketing/pages/LandingPage'
import { paths } from '../../shared/constants/paths'

export function RootPage() {
  const { session, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!session) {
    return (
      <MarketingLayout>
        <LandingPage />
      </MarketingLayout>
    )
  }

  if (session.status === 'pending_verification') {
    return <Navigate to={paths.verify} replace />
  }

  if (session.status !== 'active') {
    return <Navigate to={paths.login} replace />
  }

  return (
    <AppLayout>
      <HomePage />
    </AppLayout>
  )
}
