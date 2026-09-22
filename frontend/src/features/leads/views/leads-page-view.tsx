import { PageLayout } from '@/components/layout/page-layout';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { LeadCard } from '@/features/leads/components/lead-card';
import { LeadStatusConfirm } from '@/features/leads/components/lead-status-confirm';
import { useLeads } from '@/features/leads/hooks/use-leads';
import { useLocale } from '@/features/i18n/locale-context';

export function LeadsPageView() {
  const { t } = useLocale();
  const {
    leads,
    total,
    page,
    setPage,
    totalPages,
    isLoading,
    isFetching,
    isStatusPending,
    pendingStatus,
    requestStatusChange,
    clearPendingStatus,
    confirmStatusChange,
  } = useLeads();

  return (
    <PageLayout title={t('navLeads')} description={t('leadsIntro')}>
      {total === 0 && !isLoading ? (
        <p className="text-muted text-sm">{t('noLeads')}</p>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isPending={isStatusPending}
                onStatusClick={(status) =>
                  requestStatusChange({
                    id: lead.id,
                    customer: lead.customer.name ?? t('unknownCustomer'),
                    status,
                  })
                }
              />
            ))}
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
            onPage={setPage}
          />
        </div>
      )}

      <LeadStatusConfirm
        pending={pendingStatus}
        isPending={isStatusPending}
        onOpenChange={(open) => {
          if (!open) clearPendingStatus();
        }}
        onConfirm={confirmStatusChange}
      />
    </PageLayout>
  );
}
