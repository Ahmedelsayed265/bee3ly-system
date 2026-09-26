import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMetricValue } from '@/features/analytics/format-metric';
import {
  buyerLedger,
  type BuyerLedger,
} from '@/features/campaigns/campaign-buyer';
import type { Campaign } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

export function CampaignScorecard({ campaign }: { campaign: Campaign }) {
  return <BuyerBoard ledger={buyerLedger(campaign)} />;
}

export function BuyerBoard({ ledger }: { ledger: BuyerLedger }) {
  const { dir, locale, t } = useLocale();
  const FlowIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const count = (value: number) => formatMetricValue(value, 'count', locale);
  const money = (value: number) => formatMetricValue(value, 'egp', locale);
  const percent = (value: number) =>
    formatMetricValue(value, 'percent', locale);

  const stages: Array<
    | { kind: 'stage'; value: string; label: string }
    | { kind: 'rate'; value: string; label: string }
  > = [
    {
      kind: 'stage',
      value: count(ledger.impressions),
      label: t('metric_impressions'),
    },
    { kind: 'rate', value: percent(ledger.ctr), label: t('metricFormula_ctr') },
    { kind: 'stage', value: count(ledger.clicks), label: t('metric_clicks') },
    {
      kind: 'rate',
      value: percent(ledger.clickToConversation),
      label: t('metricFormula_clickToConversation'),
    },
    {
      kind: 'stage',
      value: count(ledger.conversations),
      label: t('metricConversations'),
    },
    {
      kind: 'rate',
      value: percent(ledger.conversationToLead),
      label: t('metricFormula_conversationToLeadRate'),
    },
    { kind: 'stage', value: count(ledger.leads), label: t('metricLeads') },
    {
      kind: 'rate',
      value: percent(ledger.leadToOrder),
      label: t('metricFormula_leadToOrderRate'),
    },
    { kind: 'stage', value: count(ledger.orders), label: t('metricOrders') },
  ];

  const moneyCells: Array<{
    label: MessageKey;
    value: string;
    unit?: string;
    caption: string;
    tone?: 'brand' | 'danger';
  }> = [
    {
      label: 'metric_spend',
      value: money(ledger.adCost),
      unit: t('egp'),
      caption: t('metricFormula_spend'),
    },
    {
      label: 'metric_revenue',
      value: money(ledger.revenue),
      unit: t('egp'),
      caption: t('metricFormula_revenue'),
    },
    {
      label: 'metric_roas',
      value: formatMetricValue(ledger.roas, 'multiple', locale),
      caption: t('metricFormula_roas'),
      tone: ledger.roas >= 1 ? 'brand' : 'danger',
    },
    {
      label: 'metric_profit',
      value:
        ledger.result == null
          ? t('netProfitNeedsCost')
          : signed(ledger.result, locale),
      unit: ledger.result == null ? undefined : t('egp'),
      caption: t('metricFormula_profit'),
      tone:
        ledger.result == null
          ? undefined
          : ledger.result < 0
            ? 'danger'
            : ledger.result > 0
              ? 'brand'
              : undefined,
    },
  ];

  const costs: Array<{ label: MessageKey; value: number }> = [
    { label: 'metric_cpm', value: ledger.cpm },
    { label: 'metric_cpc', value: ledger.cpc },
    { label: 'metric_costPerConversation', value: ledger.costPerConversation },
    { label: 'metric_cpl', value: ledger.cpl },
    { label: 'metric_cpa', value: ledger.cpa },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-ink text-sm font-semibold">{t('analyticsPath')}</h3>
        <div className="mt-3 grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {stages.map((stage) =>
            stage.kind === 'stage' ? (
              <div
                key={stage.label}
                className="bg-page min-w-0 rounded-xl px-3 py-3"
              >
                <p className="text-ink text-xl font-bold tabular-nums">
                  {stage.value}
                </p>
                <p className="text-muted mt-1 text-[11px]">{stage.label}</p>
              </div>
            ) : (
              <div
                key={stage.label}
                className="flex items-center gap-2 px-1 lg:flex-col lg:justify-center lg:text-center"
              >
                <FlowIcon className="text-muted/50 h-4 w-4 shrink-0 lg:hidden" />
                <div>
                  <p className="text-brand text-sm font-bold tabular-nums">
                    {stage.value}
                  </p>
                  <p className="text-muted mt-0.5 text-[11px] leading-snug">
                    {stage.label}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div>
        <h3 className="text-ink text-sm font-semibold">
          {t('analyticsMoney')}
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {moneyCells.map((cell) => (
            <MoneyTile
              key={cell.label}
              label={t(cell.label)}
              value={cell.value}
              unit={cell.unit}
              caption={cell.caption}
              tone={cell.tone}
            />
          ))}
        </div>
        <p className="text-muted mt-2 text-[11px] leading-5">
          {ledger.costOfGoods == null || ledger.shipping == null
            ? t('netProfitNeedsCost')
            : `${t('metric_cost')} ${money(ledger.costOfGoods)} ${t('egp')} · ${t('productShipping')} ${money(ledger.shipping)} ${t('egp')}`}
        </p>
        <p className="text-muted mt-1 text-[11px] leading-5">
          {ledger.returnedOrders === 0
            ? t('returnsNone')
            : t('returnsSummary', {
                orders: String(ledger.returnedOrders),
                revenue: `${money(ledger.returnedRevenue)} ${t('egp')}`,
                shipping:
                  ledger.returnShipping == null
                    ? t('netProfitNeedsCost')
                    : `${money(ledger.returnShipping)} ${t('egp')}`,
              })}
        </p>
      </div>

      <div>
        <h3 className="text-ink text-sm font-semibold">
          {t('analyticsUnitCost')}
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {costs.map((cell) => (
            <MoneyTile
              key={cell.label}
              label={t(cell.label)}
              value={money(cell.value)}
              unit={t('egp')}
              caption={t(
                `metricFormula_${cell.label.slice('metric_'.length)}` as MessageKey,
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function signed(value: number, locale: string) {
  const amount = formatMetricValue(Math.abs(value), 'egp', locale);
  if (value > 0) return `+${amount}`;
  if (value < 0) return `−${amount}`;
  return amount;
}

function MoneyTile({
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
        'min-w-0 rounded-xl px-4 py-3',
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
      <p className="text-muted mt-1 text-[11px] leading-4">{caption}</p>
    </div>
  );
}
