import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

function AuthLoading() {
  const { t } = useLocale();
  return (
    <div className="bg-page text-muted flex min-h-screen items-center justify-center">
      {t('loading')}
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  if (needsOnboarding && !location.pathname.startsWith(paths.onboarding)) {
    return <Navigate to={paths.onboarding} replace />;
  }

  return <Outlet />;
}

/** Public auth pages — redirect signed-in users into the app. */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)
      ?.from?.pathname;
    if (
      typeof from === 'string' &&
      from.startsWith(paths.app) &&
      !from.startsWith(paths.login)
    ) {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={paths.app} replace />;
  }

  return <Outlet />;
}
