import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import {
  fetchConversations,
  fetchOrders,
  fetchOverview,
} from '@/features/business/api'
import { campaigns, recentChats } from '@/features/dashboard/mock-data'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight,
  Bot,
  Lightbulb,
  MessageCircle,
  PackagePlus,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function greetingKey() {
  const hour = new Date().getHours()
  if (hour < 12) return 'greetingMorning' as const
  if (hour < 18) return 'greetingAfternoon' as const
  return 'greetingEvening' as const
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] ?? ''
}

function statusLabel(
  status: 'excellent' | 'attention' | 'good',
  t: (k: MessageKey) => string,
) {
  if (status === 'excellent') return t('statusExcellent')
  if (status === 'attention') return t('statusAttention')
  return t('statusGood')
}

function statusClass(status: 'excellent' | 'attention' | 'good') {
  if (status === 'excellent') return 'bg-trust/15 text-trust'
  if (status === 'attention') return 'bg-alert/25 text-[#8a5a00]'
  return 'bg-brand/10 text-brand'
}

function orderStatusTone(status: string) {
  if (status === 'COMPLETED' || status === 'CONFIRMED')
    return 'bg-trust/15 text-trust'
  if (status === 'PENDING') return 'bg-alert/25 text-[#8a5a00]'
  return 'bg-lavender text-muted'
}

/** Soft curved sales chart */
function SalesChart({
  points,
}: {
  points: Array<{ day: string; value: number }>
}) {
  const { t } = useLocale()
  const width = 560
  const height = 200
  const padX = 20
  const padY = 24
  const max = Math.max(1, ...points.map((d) => d.value))
  const mapped = points.map((d, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2)
    const y = height - padY - (d.value / max) * (height - padY * 2)
    return { x, y, ...d }
  })

  let path = ''
  if (mapped.length) {
    path = `M ${mapped[0]!.x} ${mapped[0]!.y}`
    for (let i = 1; i < mapped.length; i++) {
      const prev = mapped[i - 1]!
      const curr = mapped[i]!
      const cx = (prev.x + curr.x) / 2
      path += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`
    }
  }
  const area = mapped.length
    ? `${path} L ${mapped.at(-1)!.x} ${height - padY} L ${mapped[0]!.x} ${height - padY} Z`
    : ''
  const tip = mapped[Math.min(mapped.length - 1, 4)]

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-surface p-5 shadow-[0_12px_40px_-24px_rgba(44,44,42,0.35)]">
      <div className="pointer-events-none absolute -start-10 top-0 h-40 w-40 rounded-full bg-brand/5 blur-2xl" />
      <h3 className="relative text-sm font-semibold text-ink">
        {t('salesChartTitle')}
      </h3>
      <p className="relative mt-0.5 text-xs text-muted">
        {t('salesChartSubtitle')}
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="relative mt-2 h-48 w-full">
        <defs>
          <linearGradient id="salesFillSoul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area ? <path d={area} fill="url(#salesFillSoul)" /> : null}
        {path ? (
          <path
            d={path}
            fill="none"
            stroke="#6366F1"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ) : null}
        {mapped.map((p) => (
          <circle
            key={p.day}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#fff"
            stroke="#6366F1"
            strokeWidth="2.5"
          />
        ))}
        {tip ? (
          <g>
            <rect
              x={tip.x - 36}
              y={tip.y - 36}
              width="72"
              height="26"
              rx="8"
              fill="#0F172A"
            />
            <text
              x={tip.x}
              y={tip.y - 18}
              textAnchor="middle"
              fill="#F8FAFC"
              fontSize="11"
              fontWeight="700"
            >
              {tip.value.toLocaleString()} ج.م
            </text>
          </g>
        ) : null}
      </svg>
      <div className="relative flex justify-between px-1 text-[11px] text-muted">
        {points.map((d) => (
          <span key={d.day}>{d.day}</span>
        ))}
      </div>
    </div>
  )
}

function HeroMascot() {
  return (
    <div className="home-mascot relative mx-auto h-40 w-40 sm:h-44 sm:w-44">
      <div className="absolute inset-4 rounded-[2rem] bg-gradient-to-br from-brand/25 via-alert/20 to-trust/20 blur-xl" />
      <svg viewBox="0 0 160 160" className="relative h-full w-full drop-shadow-lg">
        <ellipse cx="80" cy="142" rx="42" ry="8" fill="#6366F1" opacity="0.15" />
        {/* body */}
        <rect x="48" y="58" width="64" height="58" rx="18" fill="#6366F1" />
        <rect x="54" y="64" width="52" height="36" rx="12" fill="#F8FAFC" />
        {/* screen chart */}
        <path
          d="M64 88 L74 78 L86 84 L98 70"
          fill="none"
          stroke="#4F46E5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="98" cy="70" r="3.5" fill="#818CF8" />
        {/* head */}
        <rect x="56" y="28" width="48" height="36" rx="14" fill="#0F172A" />
        <circle cx="70" cy="46" r="5" fill="#F8FAFC" />
        <circle cx="90" cy="46" r="5" fill="#F8FAFC" />
        <circle cx="71.5" cy="46.5" r="2" fill="#6366F1" />
        <circle cx="91.5" cy="46.5" r="2" fill="#6366F1" />
        <rect x="72" y="54" width="16" height="3" rx="1.5" fill="#818CF8" />
        {/* antenna */}
        <line x1="80" y1="28" x2="80" y2="16" stroke="#0F172A" strokeWidth="3" />
        <circle cx="80" cy="14" r="5" fill="#818CF8" />
        {/* arms */}
        <rect x="30" y="72" width="18" height="14" rx="7" fill="#6366F1" />
        <rect x="112" y="72" width="18" height="14" rx="7" fill="#6366F1" />
        {/* phone in hand */}
        <rect x="118" y="52" width="22" height="34" rx="5" fill="#0F172A" />
        <rect x="121" y="56" width="16" height="22" rx="3" fill="#4F46E5" />
        <path
          d="M124 72 L128 66 L132 69 L136 62"
          fill="none"
          stroke="#818CF8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

type MetricCard = {
  label: string
  value: string
  delta: string
  icon: LucideIcon
  tone: string
}

export function HomeDashboard() {
  const { user } = useAuth()
  const { t } = useLocale()
  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  })
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  })
  const convQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  })

  const metrics = overviewQuery.data?.metrics
  const cards: MetricCard[] = [
    {
      label: t('metricSales'),
      value: `${(metrics?.salesEgp ?? 0).toLocaleString()}`,
      delta: '+18.4%',
      icon: Wallet,
      tone: 'bg-brand/12 text-brand',
    },
    {
      label: t('metricOrders'),
      value: String(metrics?.orders ?? 0),
      delta: '+22.1%',
      icon: ShoppingBag,
      tone: 'bg-trust/15 text-trust',
    },
    {
      label: t('metricLeads'),
      value: String(metrics?.leads ?? 0),
      delta: '+34.7%',
      icon: Users,
      tone: 'bg-alert/25 text-brand',
    },
    {
      label: t('metricRoas'),
      value: '3.8x',
      delta: '+12.3%',
      icon: TrendingUp,
      tone: 'bg-ink/10 text-ink',
    },
  ]

  const latestOrders = (ordersQuery.data ?? []).slice(0, 4)
  const latestChats = (convQuery.data ?? []).slice(0, 4)
  const campaignSwatches = ['#6366F1', '#4F46E5', '#818CF8']

  const quickActions = [
    { to: '/app/products', label: t('actionAddProduct'), icon: PackagePlus },
    { to: '/app/campaigns', label: t('actionCreateCampaign'), icon: Target },
    { to: '/app/leads', label: t('actionManageCustomers'), icon: Users },
    { to: '/app/orders', label: t('actionViewOrders'), icon: ShoppingBag },
  ]

  return (
    <div className="home-dashboard w-full space-y-6">
      {/* Hero */}
      <section className="home-fade relative overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-surface via-surface to-lavender/80 px-5 py-6 shadow-[0_16px_50px_-28px_rgba(99,102,241,0.45)] sm:px-8">
        <div className="pointer-events-none absolute -end-16 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 start-1/3 h-40 w-40 rounded-full bg-trust/10 blur-3xl" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.2fr_auto]">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              bee3ly live
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {t(greetingKey(), { name: firstName(user?.name) })} 👋
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              {t('dashboardSummary')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="rounded-xl">
                <Link to="/app/inbox">{t('openSmartAssistant')}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/app/ai">{t('navAi')}</Link>
              </Button>
            </div>
          </div>
          <HeroMascot />
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="home-fade group rounded-[1.5rem] border border-border/60 bg-surface p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] transition-transform duration-300 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
                    card.tone,
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-trust">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {card.delta}
                </span>
              </div>
              <p className="mt-4 text-xs font-medium text-muted">{card.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
                {card.value}
                {card.label === t('metricSales') ? (
                  <span className="ms-1 text-sm font-semibold text-muted">
                    ج.م
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-[11px] text-muted">{t('vsYesterday')}</p>
            </div>
          )
        })}
      </section>

      {/* Chart + AI column */}
      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <SalesChart points={overviewQuery.data?.salesByDay ?? []} />

        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-trust/20 bg-gradient-to-br from-trust/15 via-surface to-surface p-5 shadow-[0_12px_40px_-24px_rgba(79,70,229,0.45)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-trust text-white">
                <Bot className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-ink">
                {t('smartAssistant')}
              </h3>
            </div>
            <p className="text-sm leading-6 text-muted">
              {t('smartAssistantHint')}
            </p>
            <Button asChild size="sm" className="mt-4 rounded-xl bg-trust hover:bg-trust/90">
              <Link to="/app/inbox">{t('openSmartAssistant')}</Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-brand/20 bg-gradient-to-br from-brand/10 via-surface to-surface p-5 shadow-[0_12px_40px_-24px_rgba(99,102,241,0.4)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-white">
                <Lightbulb className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-ink">
                {t('aiSuggestion')}
              </h3>
            </div>
            <p className="text-sm leading-6 text-muted">{t('aiSuggestionBody')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-xl">
                {t('applyRecommendation')}
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/app/campaigns">{t('viewDetails')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-[1.75rem] border border-border/60 bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(44,44,42,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{t('adPerformance')}</h3>
            <span className="text-[11px] font-medium text-muted">
              {t('activeCampaigns')}
            </span>
          </div>
          <div className="space-y-3">
            {campaigns.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl bg-page/80 px-3 py-2.5 transition-colors hover:bg-lavender/80"
              >
                <span
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white"
                  style={{ background: campaignSwatches[i % 3] }}
                >
                  {c.platform === 'facebook' ? 'Fb' : 'Ig'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {t(c.nameKey)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {t('spendLabel')} {c.spend} ج.م
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-ink">{c.roas}</p>
                  <span
                    className={cn(
                      'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      statusClass(c.status),
                    )}
                  >
                    {statusLabel(c.status, t)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(44,44,42,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{t('latestOrders')}</h3>
            <Link to="/app/orders" className="text-xs font-semibold text-brand">
              {t('viewAll')}
            </Link>
          </div>
          <div className="space-y-2.5">
            {latestOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-2xl bg-page/80 px-3 py-2.5"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lavender text-brand">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    #{o.orderNumber} · {o.customerName ?? t('unknownCustomer')}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {o.items[0]?.name ?? '—'} · {o.totalEgp.toLocaleString()} ج.م
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    orderStatusTone(o.status),
                  )}
                >
                  {t(`orderStatus_${o.status}` as MessageKey)}
                </span>
              </div>
            ))}
            {latestOrders.length === 0 ? (
              <p className="text-sm text-muted">{t('noOrders')}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(44,44,42,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{t('recentChats')}</h3>
            <Link to="/app/inbox" className="text-xs font-semibold text-brand">
              {t('viewAll')}
            </Link>
          </div>
          <div className="space-y-2.5">
            {latestChats.length > 0
              ? latestChats.map((c) => (
                  <Link
                    key={c.id}
                    to="/app/inbox"
                    className="flex items-center gap-3 rounded-2xl bg-page/80 px-3 py-2.5 transition-colors hover:bg-lavender/80"
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-alert text-[11px] font-bold text-white">
                      {(c.customer.name ?? '?').slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {c.customer.name ?? t('unknownCustomer')}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {c.messages?.[0]?.content ?? '—'}
                      </span>
                    </span>
                    <MessageCircle className="h-4 w-4 shrink-0 text-muted" />
                  </Link>
                ))
              : recentChats.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-2xl bg-page/80 px-3 py-2.5"
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-alert text-[11px] font-bold text-white">
                      {c.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {c.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {c.preview}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted">{c.time}</span>
                  </div>
                ))}
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section className="rounded-[1.75rem] border border-border/60 bg-surface p-5 shadow-[0_10px_30px_-22px_rgba(44,44,42,0.35)]">
        <h3 className="mb-4 text-sm font-semibold text-ink">{t('quickActions')}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-page/50 px-3 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-lavender/60"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-ink">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
