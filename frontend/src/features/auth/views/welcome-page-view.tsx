import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export function WelcomePageView() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLocale();

  if (isLoading) {
    return (
      <div className="bg-page text-muted flex min-h-screen items-center justify-center">
        {t('loading')}
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? paths.app : paths.login} replace />;
}
