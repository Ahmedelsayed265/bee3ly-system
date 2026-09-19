import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/auth-context'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { LocaleProvider } from '@/features/i18n/locale-context'
import { ThemeProvider } from '@/features/theme/theme-context'
import { DashboardShell } from '@/features/dashboard/dashboard-shell'
import { AiAgentPage } from '@/pages/ai-agent-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { ForgotPasswordPage } from '@/pages/forgot-password-page'
import { InboxPage } from '@/pages/inbox-page'
import { LeadsPage } from '@/pages/leads-page'
import { LoginPage } from '@/pages/login-page'
import { OnboardingPage } from '@/pages/onboarding-page'
import { OrdersPage } from '@/pages/orders-page'
import { PlaceholderPage } from '@/pages/placeholder-page'
import { ProductsPage } from '@/pages/products-page'
import { RegisterPage } from '@/pages/register-page'
import { ResetPasswordPage } from '@/pages/reset-password-page'
import { BillingPage } from '@/pages/billing-page'
import { ProfilePage } from '@/pages/profile-page'
import { SettingsPage } from '@/pages/settings-page'
import { WelcomePage } from '@/pages/welcome-page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/app/onboarding"
                    element={
                      <div className="min-h-svh bg-page px-4 py-10">
                        <OnboardingPage />
                      </div>
                    }
                  />
                  <Route path="/app" element={<DashboardShell />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="leads" element={<LeadsPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="ai" element={<AiAgentPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route
                      path="campaigns"
                      element={<PlaceholderPage titleKey="navCampaigns" />}
                    />
                    <Route
                      path="analytics"
                      element={<PlaceholderPage titleKey="navAnalytics" />}
                    />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
