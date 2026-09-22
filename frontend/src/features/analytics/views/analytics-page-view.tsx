import { PageLayout } from '@/components/layout/page-layout';
import { AnalyticsCampaignList } from '@/features/analytics/components/analytics-campaign-list';
import { AnalyticsMetricCards } from '@/features/analytics/components/analytics-metric-cards';
import { useAnalytics } from '@/features/analytics/hooks/use-analytics';

export function AnalyticsPageView() {
  const { metrics, enough, cards, campaigns, t } = useAnalytics();

  return (
    <PageLayout title={t('navAnalytics')} description={t('analyticsIntro')}>
      {!enough ? (
        <div className="border-border bg-surface rounded-2xl border border-dashed p-8 text-center">
          <p className="text-muted text-sm">{t('notEnoughData')}</p>
        </div>
      ) : (
        <>
          <AnalyticsMetricCards cards={cards} />

          <div className="border-border bg-surface rounded-2xl border p-4">
            <p className="text-muted text-sm">{t('metricConversionRate')}</p>
            <p className="text-ink mt-1 text-2xl font-bold">
              {metrics?.conversionRate != null
                ? `${metrics.conversionRate}%`
                : '—'}
            </p>
          </div>

          <AnalyticsCampaignList campaigns={campaigns} t={t} />
        </>
      )}
    </PageLayout>
  );
}
