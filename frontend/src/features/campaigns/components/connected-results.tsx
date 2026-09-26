import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMetricValue } from '@/features/analytics/format-metric';
import {
  connectedRates,
  connectedTotals,
  type ConnectedCampaign,
} from '@/features/campaigns/preview-data';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

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
    <div className="flex w-full flex-col gap-4">
      {campaigns.map((campaign) => (
        <ResultCard
          key={campaign.id}
          locale={locale}
          title={campaign.name}
          status={campaign.status}
          statusLabel={t(`campaignStatus_${campaign.status}` as MessageKey)}
          objectiveLabel={t(`campaignObj_${campaign.objective}` as MessageKey)}
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
        summary
      />
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'ACTIVE' || status === 'ASSISTED_LAUNCH') {
    return {
      pill: 'bg-brand/10 text-brand',
      dot: 'bg-brand',
      live: true,
    };
  }
  if (status === 'PAUSED' || status === 'ARCHIVED') {
    return {
      pill: 'bg-page text-muted',
      dot: 'bg-muted/70',
      live: false,
    };
  }
  return {
    pill: 'bg-lavender text-trust',
    dot: 'bg-trust',
    live: false,
  };
}

function ResultCard({
  locale,
  title,
  status,
  statusLabel,
  objectiveLabel,
  row,
  summary,
}: {
  locale: string;
  title: string;
  status?: string;
  statusLabel?: string;
  objectiveLabel?: string;
  row: MetricRow;
  summary?: boolean;
}) {
  const { dir, t } = useLocale();
  const rates = connectedRates(row);
  const tone = status ? statusTone(status) : null;
  const FlowIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const count = (value: number) => formatMetricValue(value, 'count', locale);
  const money = (value: number | null) =>
    value == null ? '—' : formatMetricValue(value, 'egp', locale);
  const roas =
    rates.roas == null
      ? '—'
      : formatMetricValue(rates.roas, 'multiple', locale);

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
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border p-5',
        summary ? 'border-border bg-page' : 'border-border/70 bg-surface',
      )}
    >
      {tone?.live ? (
        <>
          <div className="bg-brand/10 pointer-events-none absolute -inset-s-10 -top-12 h-32 w-32 rounded-full blur-2xl" />
          <div className="bg-trust/10 pointer-events-none absolute -inset-e-8 top-6 h-24 w-24 rounded-full blur-2xl" />
        </>
      ) : null}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {tone && statusLabel ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  tone.pill,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                {statusLabel}
              </span>
              {objectiveLabel ? (
                <span className="bg-page text-ink/80 rounded-full px-2.5 py-1 text-[11px] font-medium">
                  {objectiveLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          <h2
            className={cn(
              'text-ink font-bold',
              summary ? 'text-base' : 'text-lg',
            )}
          >
            {title}
          </h2>
        </div>

        <div
          className={cn(
            'shrink-0 rounded-2xl px-3.5 py-2 text-end',
            summary ? 'bg-surface' : 'bg-brand/8',
          )}
        >
          <p className="text-muted text-[10px] font-medium">
            {t('metric_roas')}
          </p>
          <p
            className={cn(
              'text-xl font-bold tabular-nums',
              rates.roas == null
                ? 'text-muted'
                : rates.roas >= 1
                  ? 'text-brand'
                  : 'text-danger',
            )}
          >
            {roas}
          </p>
        </div>
      </div>

      <div className="relative mt-5">
        <p className="text-muted mb-2 text-[11px] font-medium">
          {t('campaignColDelivery')}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ad.map((item) => (
            <div
              key={item.label}
              className={cn(
                'min-w-0 rounded-xl px-3 py-2.5',
                summary ? 'bg-surface' : 'bg-page',
              )}
            >
              <p className="text-muted truncate text-[11px]">{item.label}</p>
              <p className="text-ink mt-1 text-sm font-semibold tabular-nums">
                {item.value}
                {item.unit ? (
                  <span className="text-muted ms-1 text-[10px] font-normal">
                    {item.unit}
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <p className="text-muted mb-2 text-[11px] font-medium">
          {t('campaignColChain')}
        </p>
        <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {chain.map((item, index) => (
            <div key={item.label} className="contents">
              {index > 0 ? (
                <div className="text-muted/50 hidden items-center justify-center sm:flex">
                  <FlowIcon className="h-4 w-4" />
                </div>
              ) : null}
              <div
                className={cn(
                  'min-w-0 rounded-xl border px-3 py-3',
                  summary
                    ? 'border-border/70 bg-surface'
                    : 'border-border/60 bg-surface',
                )}
              >
                <p className="text-ink text-lg font-bold tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p className="text-muted mt-0.5 text-[11px]">{item.label}</p>
                <p className="text-muted mt-2 text-[11px] leading-4">
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
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'relative mt-4 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5',
          summary ? 'bg-surface' : 'bg-page',
        )}
      >
        <span className="text-muted text-xs">{t('metric_revenue')}</span>
        <span className="text-ink text-sm font-semibold tabular-nums">
          {count(row.revenueEgp)}{' '}
          <span className="text-muted text-[11px] font-normal">{t('egp')}</span>
        </span>
      </div>
    </article>
  );
}
