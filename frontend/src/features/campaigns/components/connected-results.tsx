import { formatMetricValue } from '@/features/analytics/format-metric';
import {
  connectedRates,
  connectedTotals,
  type ConnectedCampaign,
} from '@/features/campaigns/preview-data';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

type ConnectedResultsProps = {
  campaigns: ConnectedCampaign[];
};

type MetricRow = {
  spendEgp: number;
  impressions: number;
  clicks: number;
  conversations: number;
  leads: number;
  orders: number;
  revenueEgp: number;
};

export function ConnectedResults({ campaigns }: ConnectedResultsProps) {
  const { locale, t } = useLocale();
  const totals = connectedTotals(campaigns);

  return (
    <div className="flex w-full flex-col gap-3">
      {campaigns.map((campaign) => (
        <ResultCard
          key={campaign.id}
          locale={locale}
          title={campaign.name}
          meta={`${t(`campaignObj_${campaign.objective}` as MessageKey)} · ${t(`campaignStatus_${campaign.status}` as MessageKey)}`}
          row={{
            spendEgp: campaign.spendEgp,
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            conversations: campaign.conversations ?? 0,
            leads: campaign.leads ?? 0,
            orders: campaign.orders ?? 0,
            revenueEgp: campaign.revenueEgp ?? 0,
          }}
        />
      ))}
      <ResultCard
        locale={locale}
        title={t('analyticsTotal')}
        row={totals}
        muted
      />
    </div>
  );
}

function ResultCard({
  locale,
  title,
  meta,
  row,
  muted,
}: {
  locale: string;
  title: string;
  meta?: string;
  row: MetricRow;
  muted?: boolean;
}) {
  const { t } = useLocale();
  const rates = connectedRates(row);
  const count = (value: number) => formatMetricValue(value, 'count', locale);
  const money = (value: number | null) =>
    value == null ? '—' : formatMetricValue(value, 'egp', locale);

  const ad = [
    { label: t('metric_spend'), value: count(row.spendEgp), unit: t('egp') },
    { label: t('metric_impressions'), value: count(row.impressions) },
    { label: t('metric_clicks'), value: count(row.clicks) },
    {
      label: t('metric_ctr'),
      value:
        rates.ctr == null
          ? '—'
          : formatMetricValue(rates.ctr, 'percent', locale),
    },
    {
      label: t('metric_cpc'),
      value: money(rates.cpc),
      unit: rates.cpc == null ? undefined : t('egp'),
    },
  ];

  const chain = [
    {
      label: t('metricConversations'),
      value: count(row.conversations),
      costLabel: t('metric_costPerConversation'),
      cost: money(rates.costPerConversation),
    },
    {
      label: t('metric_leads'),
      value: count(row.leads),
      costLabel: t('metric_cpl'),
      cost: money(rates.cpl),
    },
    {
      label: t('metricOrders'),
      value: count(row.orders),
      costLabel: t('metric_cpa'),
      cost: money(rates.cpa),
    },
  ];

  return (
    <article
      className={`rounded-2xl border p-5 ${muted ? 'border-border bg-page' : 'border-border bg-surface'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-ink text-lg font-bold">{title}</h2>
          {meta ? <p className="text-muted mt-1 text-sm">{meta}</p> : null}
        </div>
        <div className="shrink-0 text-end">
          <p className="text-ink text-2xl font-bold tabular-nums">
            {rates.roas == null
              ? '—'
              : formatMetricValue(rates.roas, 'multiple', locale)}
          </p>
          <p className="text-muted mt-0.5 text-xs tabular-nums">
            {t('metric_roas')} · {count(row.revenueEgp)} {t('egp')}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <p className="text-muted mb-3 text-xs">{t('campaignColDelivery')}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
            {ad.map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-muted text-xs">{item.label}</p>
                <p className="text-ink mt-1 text-lg font-semibold tabular-nums">
                  {item.value}
                  {item.unit ? (
                    <span className="text-muted ms-1 text-[11px] font-normal">
                      {item.unit}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-border border-t pt-4 xl:border-s xl:border-t-0 xl:ps-5 xl:pt-0">
          <p className="text-muted mb-3 text-xs">{t('campaignColChain')}</p>
          <div className="grid grid-cols-3 gap-x-4">
            {chain.map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-muted text-xs">{item.label}</p>
                <p className="text-ink mt-1 text-lg font-semibold tabular-nums">
                  {item.value}
                </p>
                <p className="text-muted mt-1 text-[11px] leading-4">
                  {item.costLabel}{' '}
                  <span className="text-ink font-medium tabular-nums">
                    {item.cost}
                    {item.cost === '—' ? null : (
                      <span className="text-muted ms-1 font-normal">
                        {t('egp')}
                      </span>
                    )}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
