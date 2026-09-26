import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMetricValue } from '@/features/analytics/format-metric';
import {
  connectedRates,
  previewCampaigns,
  previewSummary,
} from '@/features/campaigns/preview-data';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

const COST_OF_GOODS = 8_000;

export function AnalyticsPageView() {
  const { dir, locale, t } = useLocale();
  const totals = previewSummary;
  const rates = connectedRates(totals);
  const profit = totals.revenueEgp - totals.spendEgp - COST_OF_GOODS;
  const FlowIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const count = (value: number) => formatMetricValue(value, 'count', locale);
  const percent = (value: number | null) =>
    value == null ? '—' : formatMetricValue(value, 'percent', locale);
  const money = (value: number | null) =>
    value == null
      ? { value: '—', unit: undefined }
      : { value: formatMetricValue(value, 'egp', locale), unit: t('egp') };

  const best = [...previewCampaigns].sort(
    (a, b) => (ratesOf(b).roas ?? 0) - (ratesOf(a).roas ?? 0),
  )[0];
  const bestRoas = ratesOf(best).roas;

  const stages: Array<
    | { kind: 'stage'; value: string; label: string }
    | { kind: 'rate'; value: string; label: string }
  > = [
    {
      kind: 'stage',
      value: count(totals.impressions),
      label: t('metric_impressions'),
    },
    {
      kind: 'rate',
      value: percent(rates.ctr),
      label: t('metricFormula_ctr'),
    },
    { kind: 'stage', value: count(totals.clicks), label: t('metric_clicks') },
    {
      kind: 'rate',
      value: percent(rates.clickToConversation),
      label: t('metricFormula_clickToConversation'),
    },
    {
      kind: 'stage',
      value: count(totals.conversations),
      label: t('metricConversations'),
    },
    {
      kind: 'rate',
      value: percent(rates.conversationToLead),
      label: t('metricFormula_conversationToLeadRate'),
    },
    { kind: 'stage', value: count(totals.leads), label: t('metricLeads') },
    {
      kind: 'rate',
      value: percent(rates.leadToOrder),
      label: t('metricFormula_leadToOrderRate'),
    },
    { kind: 'stage', value: count(totals.orders), label: t('metricOrders') },
  ];

  const moneyCells: Array<{
    value: string;
    unit?: string;
    label: MessageKey;
    formula: MessageKey;
    tone?: 'brand' | 'danger';
  }> = [
    {
      ...money(totals.spendEgp),
      label: 'metric_spend',
      formula: 'metricFormula_spend',
    },
    {
      ...money(totals.revenueEgp),
      label: 'metric_revenue',
      formula: 'metricFormula_revenue',
    },
    {
      value:
        rates.roas == null
          ? '—'
          : formatMetricValue(rates.roas, 'multiple', locale),
      label: 'metric_roas',
      formula: 'metricFormula_roas',
      tone:
        rates.roas == null ? undefined : rates.roas >= 1 ? 'brand' : 'danger',
    },
    {
      ...money(profit),
      label: 'metric_profit',
      formula: 'metricFormula_profit',
      tone: profit < 0 ? 'danger' : undefined,
    },
  ];

  const costCells: Array<{
    value: string;
    unit?: string;
    label: MessageKey;
    formula: MessageKey;
  }> = [
    {
      ...money(rates.cpm),
      label: 'metric_cpm',
      formula: 'metricFormula_cpm',
    },
    {
      ...money(rates.cpc),
      label: 'metric_cpc',
      formula: 'metricFormula_cpc',
    },
    {
      ...money(rates.costPerConversation),
      label: 'metric_costPerConversation',
      formula: 'metricFormula_costPerConversation',
    },
    {
      ...money(rates.cpl),
      label: 'metric_cpl',
      formula: 'metricFormula_cpl',
    },
    {
      ...money(rates.cpa),
      label: 'metric_cpa',
      formula: 'metricFormula_cpa',
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-ink text-2xl font-bold">{t('navAnalytics')}</h1>
        <p className="text-muted mt-1 text-sm">{t('analyticsIntro')}</p>
      </div>

      <section className="border-border/70 bg-surface relative overflow-hidden rounded-[1.75rem] border p-5">
        <div className="bg-brand/10 pointer-events-none absolute -inset-s-10 -top-12 h-32 w-32 rounded-full blur-2xl" />
        <div className="bg-trust/10 pointer-events-none absolute -inset-e-8 top-6 h-24 w-24 rounded-full blur-2xl" />

        <h2 className="text-ink relative text-lg font-bold">
          {t('analyticsPath')}
        </h2>

        <div className="relative mt-5 grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {stages.map((item) =>
            item.kind === 'stage' ? (
              <div
                key={item.label}
                className="bg-page min-w-0 rounded-xl px-4 py-4"
              >
                <p className="text-ink text-2xl font-bold tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p className="text-muted mt-1 text-xs">{item.label}</p>
              </div>
            ) : (
              <div
                key={item.label}
                className="flex items-center gap-2 px-1 py-1 lg:flex-col lg:justify-center lg:px-2 lg:text-center"
              >
                <FlowIcon className="text-muted/50 h-4 w-4 shrink-0 lg:hidden" />
                <div>
                  <p className="text-brand text-sm font-bold tabular-nums">
                    {item.value}
                  </p>
                  <p className="text-muted mt-0.5 text-[11px] leading-snug">
                    {item.label}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="border-border/70 bg-surface rounded-[1.75rem] border p-5">
        <h2 className="text-ink text-lg font-bold">{t('analyticsMoney')}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {moneyCells.map((cell) => (
            <MetricTile
              key={cell.label}
              label={t(cell.label)}
              value={cell.value}
              unit={cell.unit}
              caption={t(cell.formula)}
              tone={cell.tone}
            />
          ))}
        </div>
        <p className="bg-page text-ink mt-4 rounded-xl px-3.5 py-2.5 text-sm">
          {t('analyticsBest', {
            name: best.name,
            roas:
              bestRoas == null
                ? '—'
                : formatMetricValue(bestRoas, 'multiple', locale),
          })}
        </p>
      </section>

      <section className="border-border/70 bg-surface rounded-[1.75rem] border p-5">
        <h2 className="text-ink text-lg font-bold">{t('analyticsUnitCost')}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {costCells.map((cell) => (
            <MetricTile
              key={cell.label}
              label={t(cell.label)}
              value={cell.value}
              unit={cell.unit}
              caption={t(cell.formula)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  label,
  value,
  unit,
  caption,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  tone?: 'brand' | 'danger';
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl px-4 py-4',
        tone === 'brand' ? 'bg-brand/8' : 'bg-page',
      )}
    >
      <p className="text-muted text-[11px]">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-bold tracking-tight tabular-nums',
          tone === 'brand'
            ? 'text-brand'
            : tone === 'danger'
              ? 'text-danger'
              : 'text-ink',
        )}
      >
        {value}
        {unit ? (
          <span className="text-muted ms-1 text-[11px] font-normal">
            {unit}
          </span>
        ) : null}
      </p>
      <p className="text-muted mt-2 text-[11px] leading-4">{caption}</p>
    </div>
  );
}

function ratesOf(campaign: (typeof previewCampaigns)[number]) {
  return connectedRates({
    spendEgp: campaign.spendEgp,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversations: campaign.conversations ?? 0,
    leads: campaign.leads ?? 0,
    orders: campaign.orders ?? 0,
    revenueEgp: campaign.revenueEgp ?? 0,
  });
}
