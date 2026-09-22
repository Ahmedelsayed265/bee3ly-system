import type { RouteObject } from 'react-router-dom';
import { AiAgentPage } from '@/pages/ai-agent-page';
import { AnalyticsPage } from '@/pages/analytics-page';
import { BillingPage } from '@/pages/billing-page';
import { CampaignsPage } from '@/pages/campaigns-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { InboxPage } from '@/pages/inbox-page';
import { LeadsPage } from '@/pages/leads-page';
import { OrdersPage } from '@/pages/orders-page';
import { ProductsPage } from '@/pages/products-page';
import { ProfilePage } from '@/pages/profile-page';
import { SettingsPage } from '@/pages/settings-page';

/** Dashboard routes under `/app` — paths match sidebar `to` (without `/app` prefix). */
export const appRoutes: RouteObject[] = [
  { index: true, element: <DashboardPage /> },
  { path: 'inbox', element: <InboxPage /> },
  { path: 'leads', element: <LeadsPage /> },
  { path: 'orders', element: <OrdersPage /> },
  { path: 'products', element: <ProductsPage /> },
  { path: 'ai', element: <AiAgentPage /> },
  { path: 'profile', element: <ProfilePage /> },
  { path: 'billing', element: <BillingPage /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'campaigns', element: <CampaignsPage /> },
  { path: 'analytics', element: <AnalyticsPage /> },
];
