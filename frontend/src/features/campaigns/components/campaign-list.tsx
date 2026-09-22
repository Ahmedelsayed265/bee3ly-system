import { PaginationBar } from '@/components/ui/pagination-bar';
import type { Campaign } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

type CampaignListProps = {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
  isFetching: boolean;
  onPage: (page: number) => void;
};

export function CampaignList({
  campaigns,
  total,
  page,
  totalPages,
  isFetching,
  onPage,
}: CampaignListProps) {
  const { t } = useLocale();

  return (
    <section className="border-border bg-surface space-y-3 rounded-2xl border p-5">
      <p className="text-ink text-sm font-semibold">{t('campaignListTitle')}</p>
      {campaigns.map((c) => (
        <div
          key={c.id}
          className="border-border bg-page rounded-xl border px-3 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-ink text-sm font-semibold">{c.name}</p>
              <p className="text-muted text-xs">
                {t(`campaignObj_${c.objective}` as MessageKey)} ·{' '}
                {c.budget.toLocaleString()} ج.م
              </p>
            </div>
            <span className="bg-lavender rounded-full px-2 py-0.5 text-[10px] font-semibold">
              {t(`campaignStatus_${c.status}` as MessageKey)}
            </span>
          </div>
        </div>
      ))}
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
