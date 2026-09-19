import { Bee3lyLogo } from '@/components/brand/bee3ly-logo'
import { useAuth } from '@/features/auth/auth-context'
import { useLocale } from '@/features/i18n/locale-context'
import { cn } from '@/lib/utils'
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
} from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/app', labelKey: 'navHome' as const, icon: Home, end: true },
  { to: '/app/inbox', labelKey: 'navInbox' as const, icon: MessageCircle },
  { to: '/app/leads', labelKey: 'navLeads' as const, icon: Users },
  { to: '/app/orders', labelKey: 'navOrders' as const, icon: ShoppingBag },
  { to: '/app/products', labelKey: 'navProducts' as const, icon: Package },
  { to: '/app/ai', labelKey: 'navAi' as const, icon: Brain },
  { to: '/app/profile', labelKey: 'navProfile' as const, icon: UserRound },
  { to: '/app/billing', labelKey: 'navBilling' as const, icon: CreditCard },
  { to: '/app/settings', labelKey: 'navSettings' as const, icon: Settings },
  {
    to: '/app/campaigns',
    labelKey: 'navCampaigns' as const,
    icon: Rocket,
    soon: true,
  },
  {
    to: '/app/analytics',
    labelKey: 'navAnalytics' as const,
    icon: BarChart3,
    soon: true,
  },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function DashboardSidebar({ className }: { className?: string }) {
  const { t } = useLocale()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={cn(
        'flex h-full w-[260px] shrink-0 flex-col border-e border-border bg-surface',
        className,
      )}
    >
      <div className="h-16 border-b border-border px-5 flex items-center">
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

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-lavender">
          <Link
            to="/app/profile"
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {initials(user?.name ?? '')}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-ink">
                {user?.name}
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-none text-muted">
                {t('roleOwner')}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-danger"
            aria-label={t('logout')}
            title={t('logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 px-2 text-[10px] text-muted/55">v1.0.0</p>
      </div>
    </aside>
  )
}
