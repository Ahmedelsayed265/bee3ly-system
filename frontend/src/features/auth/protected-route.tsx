import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { useLocale } from '@/features/i18n/locale-context'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth()
  const { t } = useLocale()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-muted">
        {t('loading')}
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (
    needsOnboarding &&
    !location.pathname.startsWith('/app/onboarding')
  ) {
    return <Navigate to="/app/onboarding" replace />
  }

  return <Outlet />
}
