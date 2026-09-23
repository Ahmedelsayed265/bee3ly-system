import { formatMetricValue } from '@/features/analytics/format-metric';
import {
  connectedRates,
  previewCampaigns,
  previewSummary,
} from '@/features/campaigns/preview-data';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

const COST_OF_GOODS = 8_000;

export function AnalyticsPageView() {
  const { locale, t } = useLocale();
  const totals = previewSummary;
  const rates = connectedRates(totals);
  const profit = totals.revenueEgp - totals.spendEgp - COST_OF_GOODS;

  const money = (value: number) =>
    `${formatMetricValue(value, 'egp', locale)} ${t('egp')}`;
  const count = (value: number) => formatMetricValue(value, 'count', locale);
  const percent = (value: number | null) =>
    value == null ? '—' : formatMetricValue(value, 'percent', locale);
  const egpOrDash = (value: number | null) =>
    value == null ? '—' : money(value);

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
    label: MessageKey;
    formula: MessageKey;
  }> = [
    {
      value: money(totals.spendEgp),
      label: 'metric_spend',
      formula: 'metricFormula_spend',
    },
    {
      value: money(totals.revenueEgp),
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
    },
    {
      value: money(profit),
      label: 'metric_profit',
      formula: 'metricFormula_profit',
    },
  ];

  const costCells: Array<{
    value: string;
    label: MessageKey;
    formula: MessageKey;
  }> = [
    {
      value: egpOrDash(rates.cpm),
      label: 'metric_cpm',
      formula: 'metricFormula_cpm',
    },
    {
      value: egpOrDash(rates.cpc),
      label: 'metric_cpc',
      formula: 'metricFormula_cpc',
    },
    {
      value: egpOrDash(rates.costPerConversation),
      label: 'metric_costPerConversation',
      formula: 'metricFormula_costPerConversation',
    },
    {
      value: egpOrDash(rates.cpl),
      label: 'metric_cpl',
      formula: 'metricFormula_cpl',
    },
    {
      value: egpOrDash(rates.cpa),
      label: 'metric_cpa',
      formula: 'metricFormula_cpa',
    },
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <h1 className="text-ink text-2xl font-bold">{t('navAnalytics')}</h1>
        <p className="text-muted mt-1 text-sm">{t('analyticsIntro')}</p>
      </div>

      <section className="border-border bg-surface overflow-hidden rounded-2xl border">
        <h2 className="border-border text-ink border-b px-5 py-3 text-sm font-semibold">
          {t('analyticsPath')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)]">
          {stages.map((item) =>
            item.kind === 'stage' ? (
              <div key={item.label} className="px-5 py-6">
                <p className="text-ink text-3xl font-bold tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p className="text-muted mt-1 text-sm">{item.label}</p>
              </div>
            ) : (
              <div
                key={item.label}
                className="flex flex-col justify-center px-2 py-3 lg:items-center lg:text-center"
              >
                <p className="text-brand text-sm font-bold tabular-nums">
                  {item.value}
                </p>
                <p className="text-muted mt-1 text-[11px] leading-snug">
                  {item.label}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="border-border bg-surface overflow-hidden rounded-2xl border">
        <h2 className="border-border text-ink border-b px-5 py-3 text-sm font-semibold">
          {t('analyticsMoney')}
        </h2>
        <div className="bg-border grid gap-px sm:grid-cols-2 xl:grid-cols-4">
          {moneyCells.map((cell) => (
            <div key={cell.label} className="bg-surface px-5 py-5">
              <p className="text-ink text-2xl font-bold tracking-tight tabular-nums">
                {cell.value}
              </p>
              <p className="text-ink mt-1 text-sm font-medium">
                {t(cell.label)}
              </p>
              <p className="text-muted mt-1 text-xs">{t(cell.formula)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border bg-surface overflow-hidden rounded-2xl border">
        <h2 className="border-border text-ink border-b px-5 py-3 text-sm font-semibold">
          {t('analyticsUnitCost')}
        </h2>
        <div className="bg-border grid gap-px sm:grid-cols-2 xl:grid-cols-5">
          {costCells.map((cell) => (
            <div key={cell.label} className="bg-surface px-5 py-5">
              <p className="text-ink text-2xl font-bold tracking-tight tabular-nums">
                {cell.value}
              </p>
              <p className="text-ink mt-1 text-sm font-medium">
                {t(cell.label)}
              </p>
              <p className="text-muted mt-1 text-xs">{t(cell.formula)}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-ink text-sm">
        {t('analyticsBest', {
          name: best.name,
          roas:
            bestRoas == null
              ? '—'
              : formatMetricValue(bestRoas, 'multiple', locale),
        })}
      </p>
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
