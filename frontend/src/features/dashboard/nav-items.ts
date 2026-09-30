import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';
import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  CreditCard,
  Home,
  MessageCircle,
  Package,
  Rocket,
  Settings,
  ShoppingBag,
  UserRound,
  Users,
} from 'lucide-react';

export type DashboardNavItem = {
  to: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  end?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { to: paths.app, labelKey: 'navHome', icon: Home, end: true },
  { to: paths.inbox, labelKey: 'navInbox', icon: MessageCircle },
  { to: paths.campaigns, labelKey: 'navCampaigns', icon: Rocket },
  { to: paths.leads, labelKey: 'navLeads', icon: Users },
  { to: paths.orders, labelKey: 'navOrders', icon: ShoppingBag },
  { to: paths.products, labelKey: 'navProducts', icon: Package },
  { to: paths.ai, labelKey: 'navAi', icon: Brain },
  { to: paths.profile, labelKey: 'navProfile', icon: UserRound },
  { to: paths.billing, labelKey: 'navBilling', icon: CreditCard },
  { to: paths.settings, labelKey: 'navSettings', icon: Settings },
];
