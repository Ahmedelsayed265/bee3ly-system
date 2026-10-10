import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import {
  AdminBusinessesPage,
  AdminBusinessPage,
  AdminOverviewPage,
  AdminSubscriptionsPage,
  AdminUsagePage,
  AdminUsersPage,
} from '@/features/admin/admin-pages';
import { useAuth } from '@/features/auth/auth-context';
import { AiAgentPage } from '@/pages/ai-agent-page';
import { BillingPage } from '@/pages/billing-page';
import { CampaignsPage } from '@/pages/campaigns-page';
import { GuidePage } from '@/pages/guide-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { InboxPage } from '@/pages/inbox-page';
import { LeadsPage } from '@/pages/leads-page';
import { OrdersPage } from '@/pages/orders-page';
import { ProductsPage } from '@/pages/products-page';
import { ProfilePage } from '@/pages/profile-page';
import { SettingsPage } from '@/pages/settings-page';
import { paths } from '@/routes/paths';

function AppHome() {
  const { user } = useAuth();
  if (user?.isPlatformAdmin) return <AdminOverviewPage />;
  return <DashboardPage />;
}

function MerchantOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.isPlatformAdmin) return <Navigate to={paths.app} replace />;
  return children;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user?.isPlatformAdmin) return <Navigate to={paths.app} replace />;
  return children;
}

/** Dashboard routes under `/app` — paths match sidebar `to` (without `/app` prefix). */
export const appRoutes: RouteObject[] = [
  { index: true, element: <AppHome /> },
  {
    path: 'businesses',
    element: (
      <AdminOnly>
        <AdminBusinessesPage />
      </AdminOnly>
    ),
  },
  {
    path: 'businesses/:id',
    element: (
      <AdminOnly>
        <AdminBusinessPage />
      </AdminOnly>
    ),
  },
  {
    path: 'subscriptions',
    element: (
      <AdminOnly>
        <AdminSubscriptionsPage />
      </AdminOnly>
    ),
  },
  {
    path: 'usage',
    element: (
      <AdminOnly>
        <AdminUsagePage />
      </AdminOnly>
    ),
  },
  {
    path: 'users',
    element: (
      <AdminOnly>
        <AdminUsersPage />
      </AdminOnly>
    ),
  },
  {
    path: 'inbox',
    element: (
      <MerchantOnly>
        <InboxPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'leads',
    element: (
      <MerchantOnly>
        <LeadsPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'orders',
    element: (
      <MerchantOnly>
        <OrdersPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'products',
    element: (
      <MerchantOnly>
        <ProductsPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'ai',
    element: (
      <MerchantOnly>
        <AiAgentPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'profile',
    element: (
      <MerchantOnly>
        <ProfilePage />
      </MerchantOnly>
    ),
  },
  {
    path: 'billing',
    element: (
      <MerchantOnly>
        <BillingPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'settings',
    element: (
      <MerchantOnly>
        <SettingsPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'campaigns',
    element: (
      <MerchantOnly>
        <CampaignsPage />
      </MerchantOnly>
    ),
  },
  {
    path: 'guide',
    element: (
      <MerchantOnly>
        <GuidePage />
      </MerchantOnly>
    ),
  },
];
