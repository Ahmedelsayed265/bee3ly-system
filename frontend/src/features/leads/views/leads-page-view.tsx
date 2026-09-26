import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLayout } from '@/components/layout/page-layout';
import { CampaignFilterBanner } from '@/features/campaigns/components/campaign-filter-banner';
import { LeadStatusConfirm } from '@/features/leads/components/lead-status-confirm';
import { LeadsTable } from '@/features/leads/components/leads-table';
import { useLeads } from '@/features/leads/hooks/use-leads';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export function LeadsPageView() {
  const { t } = useLocale();
  const leads = useLeads();
  const showEmpty =
    !leads.isLoading &&
    leads.total === 0 &&
    !leads.hasFilters &&
    !leads.isFetching;

  return (
    <PageLayout title={t('navLeads')} description={t('leadsIntro')}>
      <CampaignFilterBanner />
      {showEmpty ? (
        <p className="text-muted text-sm">{t('noLeads')}</p>
      ) : (
        <LeadsTable
          leads={leads.leads}
          counts={leads.counts}
          intents={leads.intents}
          page={leads.page}
          totalPages={leads.totalPages}
          isFetching={leads.isFetching}
          isBusy={leads.isBusy}
          empty={!leads.isLoading && leads.total === 0}
          status={leads.status}
          intent={leads.intent}
          query={leads.query}
          selectedIds={leads.selected}
          onStatusFilter={leads.setStatus}
          onIntentFilter={leads.setIntent}
          onQuery={leads.setQuery}
          onClearFilters={leads.clearFilters}
          onToggle={leads.toggleSelected}
          onTogglePage={leads.togglePage}
          onClearSelected={leads.clearSelected}
          onStatusClick={(lead, status) =>
            leads.requestStatusChange({
              id: lead.id,
              customer: lead.customer.name ?? t('unknownCustomer'),
              status,
            })
          }
          onBulkStatus={leads.requestBulkStatus}
          onDeleteSelected={leads.requestDelete}
          onPage={leads.setPage}
        />
      )}

      <LeadStatusConfirm
        pending={leads.pendingStatus}
        isPending={leads.isBusy}
        onOpenChange={(open) => {
          if (!open) leads.clearPendingStatus();
        }}
        onConfirm={leads.confirmStatusChange}
      />

      <ConfirmDialog
        open={Boolean(leads.pendingBulk)}
        title={t('leadConfirmBulkTitle')}
        description={t('leadConfirmBulkBody', {
          count: String(leads.pendingBulk?.ids.length ?? 0),
          status: leads.pendingBulk
            ? t(`leadStatus_${leads.pendingBulk.status}` as MessageKey)
            : '',
        })}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        pending={leads.isBusy}
        onOpenChange={(open) => {
          if (!open) leads.clearPendingBulk();
        }}
        onConfirm={leads.confirmBulkStatus}
      />

      <ConfirmDialog
        open={leads.pendingDeleteCount > 0}
        title={t('leadConfirmDeleteTitle')}
        description={t('leadConfirmDeleteBody', {
          count: String(leads.pendingDeleteCount),
        })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        confirmClassName="bg-danger text-white hover:bg-danger/90"
        pending={leads.isBusy}
        onOpenChange={(open) => {
          if (!open) leads.clearPendingDelete();
        }}
        onConfirm={leads.confirmDelete}
      />
    </PageLayout>
  );
}
