import { PageLayout } from '@/components/layout/page-layout';
import { LeadStatusConfirm } from '@/features/leads/components/lead-status-confirm';
import { LeadsTable } from '@/features/leads/components/leads-table';
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
        <LeadsTable
          leads={leads}
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          isStatusPending={isStatusPending}
          onStatusClick={(lead, status) =>
            requestStatusChange({
              id: lead.id,
              customer: lead.customer.name ?? t('unknownCustomer'),
              status,
            })
          }
          onPage={setPage}
        />
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
