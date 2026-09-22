import { Bee3lyLogo } from '@/components/brand/bee3ly-logo';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Brain,
  CreditCard,
  Home,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Rocket,
  MessageCircle,
  UserRound,
  Users,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { paths } from '@/routes/paths';

const navItems = [
  { to: paths.app, labelKey: 'navHome' as const, icon: Home, end: true },
  { to: paths.inbox, labelKey: 'navInbox' as const, icon: MessageCircle },
  {
    to: paths.campaigns,
    labelKey: 'navCampaigns' as const,
    icon: Rocket,
    soon: true,
  },
  {
    to: paths.analytics,
    labelKey: 'navAnalytics' as const,
    icon: BarChart3,
    soon: true,
  },
  { to: paths.leads, labelKey: 'navLeads' as const, icon: Users },
  { to: paths.orders, labelKey: 'navOrders' as const, icon: ShoppingBag },
  { to: paths.products, labelKey: 'navProducts' as const, icon: Package },
  { to: paths.ai, labelKey: 'navAi' as const, icon: Brain },
  { to: paths.profile, labelKey: 'navProfile' as const, icon: UserRound },
  { to: paths.billing, labelKey: 'navBilling' as const, icon: CreditCard },
  { to: paths.settings, labelKey: 'navSettings' as const, icon: Settings },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function DashboardSidebar({ className }: { className?: string }) {
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={cn(
        'border-border bg-surface flex h-full w-[260px] shrink-0 flex-col border-e',
        className,
      )}
    >
      <div className="border-border flex h-16 items-center border-b px-5">
        <Bee3lyLogo markClassName="h-9 w-9" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, labelKey, icon: Icon, end, soon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted hover:bg-lavender hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'opacity-100' : 'opacity-80',
                  )}
                  strokeWidth={2}
                />
                <span className="flex-1 truncate">{t(labelKey)}</span>
                {soon ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-lavender text-muted',
                    )}
                  >
                    {t('comingSoonBadge')}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-border border-t px-3 py-3">
        <div className="hover:bg-lavender flex items-center gap-2 rounded-xl px-2 py-2">
          <Link
            to={paths.profile}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span className="bg-brand inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">
              {initials(user?.name ?? '')}
            </span>
            <span className="min-w-0">
              <span className="text-ink block truncate text-sm leading-tight font-semibold">
                {user?.name}
              </span>
              <span className="text-muted mt-0.5 block truncate text-[11px]">
                {t('roleOwner')}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-muted hover:bg-surface hover:text-danger inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            aria-label={t('logout')}
            title={t('logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted/55 mt-1 px-2 text-[10px]">v1.0.0</p>
      </div>
    </aside>
  );
}
