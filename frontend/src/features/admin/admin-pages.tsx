import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  MessageCircle,
  Radio,
  Search,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import { InputField } from '@/components/ui/input-field';
import { TableRowsSkeleton } from '@/components/ui/skeleton-blocks';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import {
  fetchAdminBusiness,
  fetchAdminBusinesses,
  fetchAdminOverview,
  fetchAdminSubscriptions,
  fetchAdminUsage,
  fetchAdminUsers,
  type AdminMeter,
} from '@/features/admin/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';

function money(value: number) {
  return `${value.toLocaleString()} ج.م`;
}

function billingMoney(amount: number, currency: string) {
  if (currency === 'USD') return `$${amount.toLocaleString()}`;
  return `${amount.toLocaleString()} ${currency}`;
}

function planLabel(t: (key: MessageKey) => string, plan: string) {
  return t(`adminPlan_${plan}` as MessageKey);
}

function statusLabel(t: (key: MessageKey) => string, status: string | null) {
  if (!status) return '—';
  return t(`adminStatus_${status}` as MessageKey);
}

function intervalLabel(
  t: (key: MessageKey) => string,
  interval: string | null,
) {
  if (!interval) return '—';
  return t(`adminInterval_${interval}` as MessageKey);
}

function formatDay(locale: string, value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
  );
}

function MeterBar({ meter }: { meter: AdminMeter }) {
  const ratio =
    meter.limit && meter.limit > 0
      ? Math.min(100, Math.round((meter.used / meter.limit) * 100))
      : 0;
  const bar =
    meter.level >= 100
      ? 'bg-danger'
      : meter.level >= 70
        ? 'bg-amber-500'
        : 'bg-brand';
  return (
    <div className="min-w-28">
      <p className="text-xs font-semibold">
        {meter.limit == null ? meter.used : `${meter.used} / ${meter.limit}`}
      </p>
      {meter.limit != null ? (
        <div className="bg-canvas mt-1 h-1.5 overflow-hidden rounded-full">
          <div
            className={`${bar} h-full`}
            style={{ width: `${Math.max(ratio, meter.used ? 4 : 0)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function AdminOverviewPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchAdminOverview,
  });
  const data = query.data;
  const cards = data
    ? [
        {
          label: t('adminBusinessesCount'),
          value: String(data.businesses),
          icon: Building2,
        },
        { label: t('adminUsersCount'), value: String(data.users), icon: Users },
        {
          label: t('adminOrdersCount'),
          value: String(data.ordersLast30Days),
          icon: ShoppingBag,
        },
        {
          label: t('adminRevenue'),
          value: money(data.revenueEgpLast30Days),
          icon: Wallet,
        },
        {
          label: t('adminOpenInbox'),
          value: String(data.openConversations),
          icon: MessageCircle,
        },
        {
          label: t('adminChannels'),
          value: String(data.connectedChannels),
          icon: Radio,
        },
        {
          label: t('adminMrr'),
          value: billingMoney(data.billing.mrr, 'USD'),
          icon: CreditCard,
        },
        {
          label: t('adminPaying'),
          value: String(data.billing.payingCustomers),
          icon: CreditCard,
        },
        {
          label: t('adminTrialing'),
          value: String(data.billing.trialing),
          icon: Users,
        },
        {
          label: t('adminMessages'),
          value: String(data.messagesLast30Days),
          icon: MessageCircle,
        },
        {
          label: t('adminNeedsHuman'),
          value: String(data.needsHuman),
          icon: AlertTriangle,
        },
      ]
    : [];
  const maxRevenue = Math.max(
    1,
    ...(data?.sales.map((day) => day.revenueEgp) ?? [1]),
  );
  const weekTotal =
    data?.sales.reduce((sum, day) => sum + day.revenueEgp, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t('adminOverview')}
          {user?.name ? ` · ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted mt-1 text-sm">{t('adminSalesWeek')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="border-border bg-surface flex items-center gap-3 rounded-2xl border p-4"
          >
            <span className="bg-brand/10 text-brand inline-flex h-10 w-10 items-center justify-center rounded-xl">
              <card.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-muted text-xs font-semibold">{card.label}</p>
              <p className="mt-1 text-xl font-bold">{card.value}</p>
            </div>
          </article>
        ))}
      </div>
      {data ? (
        <section className="border-border bg-surface rounded-2xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{t('adminSalesWeek')}</h2>
              <p className="text-muted mt-1 text-xs">{money(weekTotal)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.plans.map((plan) => (
                <span
                  key={plan.plan}
                  className="bg-brand/10 text-brand rounded-full px-3 py-1 text-xs font-bold"
                >
                  {planLabel(t, plan.plan)} · {plan.count}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 flex h-40 items-end gap-3" dir="ltr">
            {data.sales.map((day) => {
              const height =
                day.revenueEgp === 0
                  ? 0
                  : Math.max(12, (day.revenueEgp / maxRevenue) * 100);
              return (
                <div
                  key={day.day}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-muted max-w-full truncate text-[10px] font-semibold">
                    {day.revenueEgp ? day.revenueEgp.toLocaleString() : ''}
                  </span>
                  <div className="flex h-24 w-full items-end">
                    <div
                      className={
                        day.revenueEgp
                          ? 'bg-brand w-full rounded-t-lg'
                          : 'bg-canvas h-1 w-full rounded-full'
                      }
                      style={
                        day.revenueEgp ? { height: `${height}%` } : undefined
                      }
                      title={money(day.revenueEgp)}
                    />
                  </div>
                  <span className="text-muted text-[10px]">
                    {day.day.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {data && data.alerts.length > 0 ? (
        <section className="border-border bg-surface rounded-2xl border p-4">
          <h2 className="font-bold">{t('adminAlerts')}</h2>
          <ul className="mt-3 divide-y">
            {data.alerts.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <Link
                  to={`${paths.adminBusiness}/${row.id}`}
                  className="font-semibold hover:underline"
                >
                  {row.name}
                </Link>
                <span className="text-muted">
                  {planLabel(t, row.plan)} · {row.level}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data ? (
        <section className="border-border bg-surface overflow-hidden rounded-2xl border">
          <h2 className="px-4 pt-4 font-bold">{t('adminNewBusinesses')}</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-border bg-canvas/60 text-muted border-y text-xs font-semibold">
                  <th className="px-4 py-3 text-start">
                    {t('adminBusinesses')}
                  </th>
                  <th className="px-4 py-3 text-start">{t('adminPlan')}</th>
                  <th className="px-4 py-3 text-start">{t('adminStatus')}</th>
                  <th className="px-4 py-3 text-start">{t('adminOrders')}</th>
                  <th className="px-4 py-3 text-start whitespace-nowrap">
                    {t('adminJoined')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentBusinesses.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`${paths.adminBusiness}/${row.id}`}
                        className="font-semibold hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {planLabel(t, row.plan)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusLabel(t, row.status)}
                    </td>
                    <td className="px-4 py-3">{row.orders}</td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">
                      {formatDay(locale, row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function AdminBusinessesPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'businesses', search],
    queryFn: () => fetchAdminBusinesses(search),
  });
  const rows = query.data ?? [];

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="text-2xl font-bold">{t('adminBusinesses')}</h1>
      <div className="border-border/70 bg-surface w-full overflow-hidden rounded-[1.75rem] border">
        <div className="p-4">
          <InputField
            icon={Search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('adminSearch')}
            aria-label={t('adminSearch')}
            containerClassName="max-w-md"
          />
        </div>
        <div className="border-border overflow-x-auto border-t">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold">
                <th className="px-4 py-3 text-start">{t('adminBusinesses')}</th>
                <th className="px-4 py-3 text-start">{t('adminOwner')}</th>
                <th className="px-4 py-3 text-start">{t('adminPlan')}</th>
                <th className="px-4 py-3 text-start">{t('adminStatus')}</th>
                <th className="px-4 py-3 text-start">{t('adminOrders')}</th>
                <th className="px-4 py-3 text-start">
                  {t('adminConversations')}
                </th>
                <th className="px-4 py-3 text-start">{t('adminProducts')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <TableRowsSkeleton rows={8} cols={7} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted px-4 py-10 text-center">
                    {t('adminEmpty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-canvas/40 border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`${paths.adminBusiness}/${row.id}`}
                        className="font-semibold hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="text-muted text-xs">{row.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{row.ownerName ?? '—'}</p>
                      <p className="text-muted text-xs">{row.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {planLabel(t, row.plan)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusLabel(t, row.subscriptionStatus)}
                    </td>
                    <td className="px-4 py-3">{row.orders}</td>
                    <td className="px-4 py-3">{row.conversations}</td>
                    <td className="px-4 py-3">{row.products}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => fetchAdminUsers(search),
  });
  const rows = query.data ?? [];

  return (
    <div className="flex w-full flex-col gap-3">
      <h1 className="text-2xl font-bold">{t('adminUsers')}</h1>
      <div className="border-border/70 bg-surface w-full overflow-hidden rounded-[1.75rem] border">
        <div className="p-4">
          <InputField
            icon={Search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('adminSearch')}
            aria-label={t('adminSearch')}
            containerClassName="max-w-md"
          />
        </div>
        <div className="border-border overflow-x-auto border-t">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold">
                <th className="px-4 py-3 text-start">{t('adminColName')}</th>
                <th className="px-4 py-3 text-start">{t('adminColEmail')}</th>
                <th className="px-4 py-3 text-start">{t('adminColRole')}</th>
                <th className="px-4 py-3 text-start">
                  {t('adminColBusiness')}
                </th>
                <th className="px-4 py-3 text-start whitespace-nowrap">
                  {t('adminJoined')}
                </th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <TableRowsSkeleton rows={8} cols={5} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted px-4 py-10 text-center text-sm"
                  >
                    {t('adminEmpty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-canvas/40 border-b last:border-b-0"
                  >
                    <td className="text-ink px-4 py-3 font-semibold">
                      {row.name}
                    </td>
                    <td className="text-muted px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          row.isPlatformAdmin
                            ? 'bg-brand/15 text-brand rounded-full px-4 text-xs font-bold whitespace-nowrap'
                            : 'bg-canvas text-ink rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap'
                        }
                      >
                        {row.isPlatformAdmin
                          ? t('adminPlatform')
                          : t('adminMerchant')}
                      </span>
                    </td>
                    <td className="text-ink px-4 py-3">
                      {row.businesses.join(' · ') || '—'}
                    </td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-GB',
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminSubscriptionsPage() {
  const { t, locale } = useLocale();
  const query = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: fetchAdminSubscriptions,
  });
  const data = query.data;
  const cards = data
    ? [
        { label: t('adminMrr'), value: billingMoney(data.billing.mrr, 'USD') },
        { label: t('adminArr'), value: billingMoney(data.billing.arr, 'USD') },
        {
          label: t('adminPaying'),
          value: String(data.billing.payingCustomers),
        },
        { label: t('adminTrialing'), value: String(data.billing.trialing) },
        { label: t('adminCanceled'), value: String(data.billing.canceled) },
      ]
    : [];

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('adminSubscriptions')}</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Stat key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
      <div className="border-border/70 bg-surface overflow-hidden rounded-[1.75rem] border">
        <div className="border-border overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold">
                <th className="px-4 py-3 text-start">{t('adminBusinesses')}</th>
                <th className="px-4 py-3 text-start">{t('adminPlan')}</th>
                <th className="px-4 py-3 text-start">{t('adminStatus')}</th>
                <th className="px-4 py-3 text-start">{t('adminInterval')}</th>
                <th className="px-4 py-3 text-start">{t('adminAmount')}</th>
                <th className="px-4 py-3 text-start whitespace-nowrap">
                  {t('adminPeriodEnd')}
                </th>
                <th className="px-4 py-3 text-start whitespace-nowrap">
                  {t('adminTrialEnds')}
                </th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <TableRowsSkeleton rows={8} cols={7} />
              ) : (data?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted px-4 py-10 text-center">
                    {t('adminEmpty')}
                  </td>
                </tr>
              ) : (
                data?.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-canvas/40 border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`${paths.adminBusiness}/${row.businessId}`}
                        className="font-semibold hover:underline"
                      >
                        {row.businessName}
                      </Link>
                      <p className="text-muted text-xs">{row.type}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {planLabel(t, row.plan)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusLabel(t, row.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {intervalLabel(t, row.interval)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {billingMoney(row.amount, row.currency)}
                    </td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">
                      {formatDay(locale, row.periodEnd)}
                    </td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">
                      {formatDay(locale, row.trialEndsAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminUsagePage() {
  const { t } = useLocale();
  const query = useQuery({
    queryKey: ['admin', 'usage'],
    queryFn: fetchAdminUsage,
  });
  const rows = query.data ?? [];

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold">{t('adminUsage')}</h1>
        <p className="text-muted mt-1 text-sm">{t('adminUsageMonth')}</p>
      </div>
      <div className="border-border/70 bg-surface overflow-hidden rounded-[1.75rem] border">
        <div className="border-border overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold">
                <th className="px-4 py-3 text-start">{t('adminBusinesses')}</th>
                <th className="px-4 py-3 text-start">{t('adminPlan')}</th>
                <th className="px-4 py-3 text-start">
                  {t('adminConversations')}
                </th>
                <th className="px-4 py-3 text-start">{t('adminWhatsapp')}</th>
                <th className="px-4 py-3 text-start">{t('adminAiActions')}</th>
                <th className="px-4 py-3 text-start">{t('adminOrders')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <TableRowsSkeleton rows={8} cols={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted px-4 py-10 text-center">
                    {t('adminEmpty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-canvas/40 border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`${paths.adminBusiness}/${row.id}`}
                        className="font-semibold hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="text-muted text-xs">
                        {statusLabel(t, row.status)}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {planLabel(t, row.plan)}
                    </td>
                    <td className="px-4 py-3">
                      <MeterBar meter={row.conversations} />
                    </td>
                    <td className="px-4 py-3">
                      <MeterBar meter={row.whatsapp} />
                    </td>
                    <td className="px-4 py-3">
                      <MeterBar meter={row.ai} />
                    </td>
                    <td className="px-4 py-3">
                      <MeterBar meter={row.orders} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminBusinessPage() {
  const { id = '' } = useParams();
  const { t, locale } = useLocale();
  const query = useQuery({
    queryKey: ['admin', 'business', id],
    queryFn: () => fetchAdminBusiness(id),
    enabled: Boolean(id),
  });
  const row = query.data;
  if (!row) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={paths.adminBusiness}
          className="text-brand text-sm font-semibold"
        >
          {t('adminBack')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{row.name}</h1>
        <p className="text-muted mt-1 text-sm">
          {planLabel(t, row.plan)} · {statusLabel(t, row.subscriptionStatus)} ·{' '}
          {intervalLabel(t, row.interval)} · {row.type}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('adminOrders')} value={String(row.orders)} />
        <Stat
          label={t('adminConversations')}
          value={String(row.conversations)}
        />
        <Stat label={t('adminProducts')} value={String(row.products)} />
        <Stat label={t('adminCampaigns')} value={String(row.campaigns)} />
      </div>
      <section className="border-border bg-surface rounded-2xl border p-4">
        <h2 className="font-bold">{t('adminSubscriptions')}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Detail
            label={t('adminAmount')}
            value={
              row.amount == null ? '—' : billingMoney(row.amount, row.currency)
            }
          />
          <Detail
            label={t('adminPeriodEnd')}
            value={formatDay(locale, row.periodEnd)}
          />
          <Detail
            label={t('adminTrialEnds')}
            value={formatDay(locale, row.trialEndsAt)}
          />
          <Detail
            label={t('adminMessages')}
            value={`${row.messages.CUSTOMER ?? 0} ${t('adminCustomerMessages')} · ${row.messages.AI ?? 0} ${t('adminAiMessages')} · ${row.messages.HUMAN ?? 0} ${t('adminHumanMessages')}`}
          />
        </dl>
      </section>
      <section className="border-border bg-surface rounded-2xl border p-4">
        <h2 className="font-bold">{t('adminUsageMonth')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UsageStat
            label={t('adminConversations')}
            meter={row.usage.conversations}
          />
          <UsageStat label={t('adminWhatsapp')} meter={row.usage.whatsapp} />
          <UsageStat label={t('adminAiActions')} meter={row.usage.ai} />
          <UsageStat label={t('adminOrders')} meter={row.usage.orders} />
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <CountList
          title={t('adminByStatus')}
          rows={row.conversationStatuses.map((item) => ({
            key: item.status,
            label: item.status,
            count: item.count,
          }))}
        />
        <CountList
          title={t('adminByChannel')}
          rows={row.conversationChannels.map((item) => ({
            key: item.channel,
            label: item.channel,
            count: item.count,
          }))}
        />
      </div>
      <section className="border-border bg-surface rounded-2xl border p-4">
        <h2 className="font-bold">{t('adminMembers')}</h2>
        <ul className="mt-3 divide-y text-sm">
          {row.members.map((member) => (
            <li
              key={member.email}
              className="flex items-center justify-between py-2"
            >
              <span>
                <span className="font-semibold">{member.name}</span>
                <span className="text-muted block text-xs">{member.email}</span>
              </span>
              <span className="text-muted text-xs">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="border-border bg-surface rounded-2xl border p-4">
        <h2 className="font-bold">{t('adminChannels')}</h2>
        <ul className="mt-3 divide-y text-sm">
          {row.channels.map((channel) => (
            <li
              key={`${channel.platform}-${channel.displayName}`}
              className="flex items-center justify-between py-2"
            >
              <span>
                {channel.platform}
                <span className="text-muted block text-xs">
                  {channel.displayName ?? '—'}
                </span>
              </span>
              <span className="text-muted text-xs">{channel.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="border-border bg-surface rounded-2xl border p-4">
        <h2 className="font-bold">{t('adminRecentOrders')}</h2>
        <ul className="mt-3 divide-y text-sm">
          {row.recentOrders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between py-2"
            >
              <span>
                #{order.orderNumber} · {order.customerName ?? '—'}
                <span className="text-muted block text-xs">{order.status}</span>
              </span>
              <span className="font-semibold">{money(order.totalEgp)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="border-border bg-surface rounded-2xl border p-4">
      <p className="text-muted text-xs font-semibold">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs font-semibold">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function UsageStat({ label, meter }: { label: string; meter: AdminMeter }) {
  return (
    <div>
      <p className="text-muted text-xs font-semibold">{label}</p>
      <div className="mt-2">
        <MeterBar meter={meter} />
      </div>
    </div>
  );
}

function CountList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
}) {
  return (
    <section className="border-border bg-surface rounded-2xl border p-4">
      <h2 className="font-bold">{title}</h2>
      <ul className="mt-3 divide-y text-sm">
        {rows.length === 0 ? (
          <li className="text-muted py-2">—</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between py-2"
            >
              <span>{row.label}</span>
              <span className="font-semibold">{row.count}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
