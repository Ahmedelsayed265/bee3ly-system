import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { useLocale } from '@/features/i18n/locale-context'

export function WelcomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useLocale()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-muted">
        {t('loading')}
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/app' : '/login'} replace />
}
