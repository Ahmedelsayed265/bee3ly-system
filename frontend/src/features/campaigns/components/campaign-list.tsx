import { PaginationBar } from '@/components/ui/pagination-bar';
import { ChainStrip } from '@/features/analytics/components/chain-strip';
import type { Campaign } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type CampaignListProps = {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
  isFetching: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPage: (page: number) => void;
};

export function CampaignList({
  campaigns,
  total,
  page,
  totalPages,
  isFetching,
  selectedId,
  onSelect,
  onPage,
}: CampaignListProps) {
  const { t } = useLocale();

  return (
    <section className="space-y-3">
      {campaigns.map((campaign) => {
        const open = selectedId === campaign.id;
        return (
          <div
            key={campaign.id}
            className={cn(
              'rounded-2xl border',
              open ? 'border-brand bg-surface' : 'border-border',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(open ? '' : campaign.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
            >
              <div className="min-w-0">
                <p className="text-ink truncate text-sm font-semibold">
                  {campaign.name}
                </p>
                <p className="text-muted text-xs">
                  {t(`campaignObj_${campaign.objective}` as MessageKey)} ·{' '}
                  {t(`campaignStatus_${campaign.status}` as MessageKey)}
                </p>
              </div>
              <p className="text-ink shrink-0 text-sm font-semibold">
                {campaign.orders ?? 0} {t('metricOrders')}
              </p>
            </button>
            {open ? (
              <div className="px-4 pb-4">
                <ChainStrip
                  inset
                  items={[
                    {
                      label: t('metricConversations'),
                      value: String(campaign.conversations ?? 0),
                    },
                    {
                      label: t('metricLeads'),
                      value: String(campaign.leads ?? 0),
                    },
                    {
                      label: t('metricOrders'),
                      value: String(campaign.orders ?? 0),
                    },
                    {
                      label: t('metric_revenue'),
                      value: `${(campaign.revenueEgp ?? 0).toLocaleString()} ${t('egp')}`,
                    },
                  ]}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      {total === 0 ? (
        <p className="text-muted text-sm">{t('campaignEmpty')}</p>
      ) : null}
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
    </section>
  );
}
