import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from '@/features/leads/constants';

type LeadsTableProps = {
  leads: Lead[];
  page: number;
  totalPages: number;
  isFetching: boolean;
  isStatusPending: boolean;
  onStatusClick: (lead: Lead, status: LeadStatus) => void;
  onPage: (page: number) => void;
};

export function LeadsTable({
  leads,
  page,
  totalPages,
  isFetching,
  isStatusPending,
  onStatusClick,
  onPage,
}: LeadsTableProps) {
  const { t } = useLocale();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="border-border bg-surface w-full overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-180 border-collapse text-sm">
          <thead>
            <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold tracking-wide uppercase">
              <th className="px-4 py-3 text-start">{t('leadColCustomer')}</th>
              <th className="px-4 py-3 text-start">{t('leadColPhone')}</th>
              <th className="px-4 py-3 text-start">{t('leadColIntent')}</th>
              <th className="px-4 py-3 text-start">{t('leadColStatus')}</th>
              <th className="px-4 py-3 text-start">{t('leadColActions')}</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-border hover:bg-canvas/40 border-b last:border-b-0"
              >
                <td className="text-ink px-4 py-3 text-start font-semibold">
                  {lead.customer.name ?? t('unknownCustomer')}
                </td>
                <td className="text-muted px-4 py-3 text-start tabular-nums">
                  {lead.customer.phone ?? '—'}
                </td>
                <td className="text-ink px-4 py-3 text-start">
                  {lead.intent
                    ? t(`leadIntent_${lead.intent}` as MessageKey)
                    : '—'}
                </td>
                <td className="px-4 py-3 text-start">
                  <span className="bg-lavender text-ink inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                    {t(`leadStatus_${lead.status}` as MessageKey)}
                  </span>
                </td>
                <td className="px-4 py-3 text-start">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {LEAD_STATUSES.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={lead.status === status ? 'default' : 'outline'}
                        className="h-8 px-2.5 text-xs"
                        disabled={isStatusPending || lead.status === status}
                        onClick={() => onStatusClick(lead, status)}
                      >
                        {t(`leadStatus_${status}` as MessageKey)}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
