import { Navigate } from 'react-router-dom';
import { AuthLoadingSkeleton } from '@/components/ui/skeleton-blocks';
import { useAuth } from '@/features/auth/auth-context';
import { paths } from '@/routes/paths';

export function WelcomePageView() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  return <Navigate to={isAuthenticated ? paths.app : paths.login} replace />;
}
