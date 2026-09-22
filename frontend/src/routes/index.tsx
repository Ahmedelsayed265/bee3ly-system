import { Navigate, createBrowserRouter } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from '@/features/auth/auth-guards';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { ForgotPasswordPage } from '@/pages/forgot-password-page';
import { LoginPage } from '@/pages/login-page';
import { OnboardingPage } from '@/pages/onboarding-page';
import { RegisterPage } from '@/pages/register-page';
import { ResetPasswordPage } from '@/pages/reset-password-page';
import { WelcomePage } from '@/pages/welcome-page';
import { appRoutes } from '@/routes/app-routes';
import { paths } from '@/routes/paths';

export const router = createBrowserRouter([
  {
    path: paths.home,
    element: <WelcomePage />,
  },
  {
    element: <GuestRoute />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: 'app/onboarding',
        element: (
          <div className="bg-page min-h-svh px-4 py-10">
            <OnboardingPage />
          </div>
        ),
      },
      {
        path: 'app',
        element: <DashboardShell />,
        children: appRoutes,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={paths.home} replace />,
  },
]);
