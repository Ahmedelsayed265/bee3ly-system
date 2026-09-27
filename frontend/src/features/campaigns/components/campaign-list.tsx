import { PaginationBar } from '@/components/ui/pagination-bar';
import { formatMetricValue } from '@/features/analytics/format-metric';
import type { Campaign } from '@/features/business/api';
import { buyerLedger, sumLedgers } from '@/features/campaigns/campaign-buyer';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type CampaignListProps = {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
  isFetching: boolean;
  onOpen: (id: string) => void;
  onPage: (page: number) => void;
};

export function CampaignList({
  campaigns,
  total,
  page,
  totalPages,
  isFetching,
  onOpen,
  onPage,
}: CampaignListProps) {
  const { locale, t } = useLocale();
  const book = sumLedgers(campaigns);

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="border-border/70 bg-surface rounded-[1.75rem] border p-5">
        <h2 className="text-ink text-lg font-bold">{t('campaignBook')}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <BookCell
            label={t('metric_revenue')}
            value={`${formatMetricValue(book.revenue, 'egp', locale)} ${t('egp')}`}
          />
          <BookCell
            label={t('metric_spend')}
            value={`${formatMetricValue(book.adCost, 'egp', locale)} ${t('egp')}`}
          />
          <BookCell
            label={t('campaignResult')}
            value={
              book.result == null
                ? t('netProfitNeedsCost')
                : `${signed(book.result, locale)} ${t('egp')}`
            }
            tone={
              book.result == null
                ? undefined
                : book.result < 0
                  ? 'danger'
                  : book.result > 0
                    ? 'brand'
                    : undefined
            }
          />
          <BookCell
            label={t('metric_roas')}
            value={formatMetricValue(book.roas, 'multiple', locale)}
            tone={book.roas >= 1 ? 'brand' : 'danger'}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <BookCell
            label={t('metric_impressions')}
            value={formatMetricValue(book.impressions, 'count', locale)}
          />
          <BookCell
            label={t('metric_clicks')}
            value={formatMetricValue(book.clicks, 'count', locale)}
          />
          <BookCell
            label={t('metric_ctr')}
            value={formatMetricValue(book.ctr, 'percent', locale)}
          />
          <BookCell
            label={t('metric_cpm')}
            value={`${formatMetricValue(book.cpm, 'egp', locale)} ${t('egp')}`}
          />
          <BookCell
            label={t('metric_cpc')}
            value={`${formatMetricValue(book.cpc, 'egp', locale)} ${t('egp')}`}
          />
        </div>
      </div>
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onOpen={() => onOpen(campaign.id)}
        />
      ))}
      {total === 0 ? (
        <p className="text-muted text-sm">{t('campaignEmpty')}</p>
      ) : (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          fetching={isFetching}
          previousLabel={t('previous')}
          nextLabel={t('next')}
          pageLabel={t('pageOf', {
            page: String(page),
            total: String(totalPages),
          })}
          onPage={onPage}
        />
      )}
    </section>
  );
}

function CampaignCard({
  campaign,
  onOpen,
}: {
  campaign: Campaign;
  onOpen: () => void;
}) {
  const { locale, t } = useLocale();
  const tone = statusTone(campaign.status);
  const focus = focusMetric(campaign.objective);
  const ledger = buyerLedger(campaign);
  const count = (value: number) => formatMetricValue(value, 'count', locale);
  const money = (value: number) => formatMetricValue(value, 'egp', locale);
  const chain = [
    {
      key: 'conversations',
      label: t('metricConversations'),
      value: count(campaign.conversations ?? 0),
    },
    {
      key: 'leads',
      label: t('metricLeads'),
      value: count(campaign.leads ?? 0),
    },
    {
      key: 'orders',
      label: t('metricOrders'),
      value: count(campaign.orders ?? 0),
    },
  ];

  return (
    <article
      className={cn(
        'border-border/70 bg-surface relative overflow-hidden rounded-[1.75rem] border',
        tone.live && 'bg-surface',
      )}
    >
      {tone.live ? (
        <>
          <div className="bg-brand/10 pointer-events-none absolute -inset-s-10 -top-12 h-32 w-32 rounded-full blur-2xl" />
          <div className="bg-trust/10 pointer-events-none absolute -inset-e-8 top-6 h-24 w-24 rounded-full blur-2xl" />
        </>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        className="relative flex w-full flex-col gap-4 p-5 text-start"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  tone.pill,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                {t(`campaignStatus_${campaign.status}` as MessageKey)}
              </span>
              <span className="bg-page text-ink/80 rounded-full px-2.5 py-1 text-[11px] font-medium">
                {t(`campaignObj_${campaign.objective}` as MessageKey)}
              </span>
            </div>
            <h2 className="text-ink text-lg font-bold">{campaign.name}</h2>
          </div>
          <div
            className={cn(
              'shrink-0 rounded-2xl px-3.5 py-2 text-end',
              ledger.result == null
                ? 'bg-page'
                : ledger.result < 0
                  ? 'bg-danger/10'
                  : 'bg-brand/8',
            )}
          >
            <p className="text-muted text-[10px] font-medium">
              {ledger.result == null
                ? t('metric_profit')
                : ledger.result < 0
                  ? t('campaignResultLoss')
                  : t('campaignResultProfit')}
            </p>
            <p
              className={cn(
                'text-xl font-bold tabular-nums',
                ledger.result == null
                  ? 'text-muted text-sm'
                  : ledger.result < 0
                    ? 'text-danger'
                    : 'text-brand',
              )}
            >
              {ledger.result == null
                ? t('netProfitNeedsCost')
                : signed(ledger.result, locale)}
              {ledger.result == null ? null : (
                <span className="text-muted ms-1 text-[11px] font-normal">
                  {t('egp')}
                </span>
              )}
            </p>
            <p className="text-muted text-[11px] tabular-nums">
              {formatMetricValue(ledger.roas, 'multiple', locale)}{' '}
              {t('metric_roas')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MiniMoney
            label={t('metric_spend')}
            value={money(ledger.adCost)}
            unit={t('egp')}
          />
          <MiniMoney
            label={t('metric_impressions')}
            value={count(ledger.impressions)}
          />
          <MiniMoney label={t('metric_clicks')} value={count(ledger.clicks)} />
          <MiniMoney
            label={t('metric_ctr')}
            value={formatMetricValue(ledger.ctr, 'percent', locale)}
          />
          <MiniMoney
            label={t('metric_cpc')}
            value={money(ledger.cpc)}
            unit={t('egp')}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {chain.map((item) => (
            <div
              key={item.key}
              className={cn(
                'min-w-0 rounded-xl px-3 py-3',
                focus === item.key ? 'bg-brand/8' : 'bg-page',
              )}
            >
              <p className="text-muted text-[11px]">{item.label}</p>
              <p className="text-ink mt-1 text-lg font-bold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniMoney
            label={t('metric_revenue')}
            value={money(ledger.revenue)}
            unit={t('egp')}
          />
          <MiniMoney
            label={t('campaignAdBudget')}
            value={money(ledger.adCost)}
            unit={t('egp')}
          />
          <MiniMoney
            label={t('campaignResult')}
            value={
              ledger.result == null
                ? t('netProfitNeedsCost')
                : signed(ledger.result, locale)
            }
            unit={ledger.result == null ? undefined : t('egp')}
            tone={
              ledger.result == null
                ? undefined
                : ledger.result < 0
                  ? 'danger'
                  : ledger.result > 0
                    ? 'brand'
                    : undefined
            }
          />
        </div>
      </button>
    </article>
  );
}

function signed(value: number, locale: string) {
  const amount = formatMetricValue(Math.abs(value), 'egp', locale);
  if (value > 0) return `+${amount}`;
  if (value < 0) return `−${amount}`;
  return amount;
}

function BookCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
          'mt-1 text-lg font-bold tabular-nums',
          tone === 'brand'
            ? 'text-brand'
            : tone === 'danger'
              ? 'text-danger'
              : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MiniMoney({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'brand' | 'danger';
}) {
  return (
    <div className="bg-page min-w-0 rounded-xl px-3 py-2.5">
      <p className="text-muted text-[11px]">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
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
    </div>
  );
}

function focusMetric(objective: string) {
  if (objective === 'MORE_MESSAGES') return 'conversations';
  if (objective === 'MORE_LEADS' || objective === 'MORE_BOOKINGS')
    return 'leads';
  if (objective === 'MORE_ORDERS' || objective === 'RETARGETING')
    return 'orders';
  return '';
}

function statusTone(status: string) {
  if (status === 'ACTIVE' || status === 'ASSISTED_LAUNCH') {
    return { pill: 'bg-brand/10 text-brand', dot: 'bg-brand', live: true };
  }
  if (status === 'PAUSED' || status === 'ARCHIVED') {
    return { pill: 'bg-page text-muted', dot: 'bg-muted/70', live: false };
  }
  return { pill: 'bg-lavender text-trust', dot: 'bg-trust', live: false };
}
