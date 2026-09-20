import { useQuery } from '@tanstack/react-query'
import { PageLayout } from '@/components/layout/page-layout'
import { fetchOverview } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'

export function AnalyticsPage() {
  const { t } = useLocale()
  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  })

  const m = overviewQuery.data?.metrics
  const enough = overviewQuery.data?.enoughData

  const cards = [
    { label: t('metricConversations'), value: m?.conversations ?? 0 },
    { label: t('metricLeads'), value: m?.leads ?? 0 },
    { label: t('metricOrders'), value: m?.orders ?? 0 },
    {
      label: t('metricConversions'),
      value: m?.conversions ?? 0,
    },
    { label: t('metricAiHandled'), value: m?.aiHandled ?? 0 },
    { label: t('metricHandoffs'), value: m?.humanHandoffs ?? 0 },
  ]

  return (
    <PageLayout title={t('navAnalytics')} description={t('analyticsIntro')}>
      {!enough ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">{t('notEnoughData')}</p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <p className="text-xs text-muted">{c.label}</p>
                <p className="mt-2 text-2xl font-bold text-ink">{c.value}</p>
              </div>
            ))}
          </section>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">{t('metricConversionRate')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {m?.conversionRate != null ? `${m.conversionRate}%` : '—'}
            </p>
          </div>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              {t('campaignAttribution')}
            </h2>
            <div className="space-y-2">
              {(overviewQuery.data?.campaigns ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-page px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-xs text-muted">
                      {t(`campaignStatus_${c.status}` as MessageKey)}
                    </p>
                  </div>
                  <div className="text-xs text-muted">
                    {c.conversations} {t('metricConversations')} · {c.leads}{' '}
                    {t('metricLeads')} · {c.orders} {t('metricOrders')} ·{' '}
                    {c.revenueEgp.toLocaleString()} ج.م
                  </div>
                </div>
              ))}
              {(overviewQuery.data?.campaigns?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted">{t('campaignEmpty')}</p>
              ) : null}
            </div>
          </section>
        </>
      )}
    </PageLayout>
  )
}
