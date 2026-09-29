import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthLoadingSkeleton } from '@/components/ui/skeleton-blocks';
import { useAuth } from '@/features/auth/auth-context';
import { paths } from '@/routes/paths';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/** Public auth pages — redirect signed-in users into the app. */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSkeleton />;
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
