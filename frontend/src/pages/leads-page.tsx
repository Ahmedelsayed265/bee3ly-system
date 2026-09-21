import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { fetchLeads, updateLeadStatus } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'

const STATUSES = ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'] as const
const PAGE_SIZE = 9

export function LeadsPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pendingStatus, setPendingStatus] = useState<{
    id: string
    customer: string
    status: (typeof STATUSES)[number]
  } | null>(null)

  const leadsQuery = useQuery({
    queryKey: ['leads', page, PAGE_SIZE],
    queryFn: () => fetchLeads(page, PAGE_SIZE),
  })
  const leads = leadsQuery.data?.leads ?? []
  const total = leadsQuery.data?.total ?? 0
  const totalPages = leadsQuery.data?.totalPages ?? 1

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateLeadStatus(id, status),
    onSuccess: async () => {
      setPendingStatus(null)
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  return (
    <PageLayout title={t('navLeads')} description={t('leadsIntro')}>
      {total === 0 && !leadsQuery.isLoading ? (
        <p className="text-sm text-muted">{t('noLeads')}</p>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="space-y-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {lead.customer.name ?? t('unknownCustomer')}
                    </p>
                    <p className="text-sm text-muted">
                      {lead.intent
                        ? t(`leadIntent_${lead.intent}` as MessageKey)
                        : '—'}{' '}
                      · {lead.customer.phone ?? '—'}
                    </p>
                  </div>
                  <span className="rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold">
                    {t(`leadStatus_${lead.status}` as MessageKey)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={lead.status === s ? 'default' : 'outline'}
                      className="h-7 text-[11px]"
                      disabled={statusMut.isPending || lead.status === s}
                      onClick={() =>
                        setPendingStatus({
                          id: lead.id,
                          customer:
                            lead.customer.name ?? t('unknownCustomer'),
                          status: s,
                        })
                      }
                    >
                      {t(`leadStatus_${s}` as MessageKey)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            fetching={leadsQuery.isFetching}
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

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={t('confirmLeadStatusTitle')}
        description={t('confirmLeadStatusBody', {
          customer: pendingStatus?.customer ?? '',
          status: pendingStatus
            ? t(`leadStatus_${pendingStatus.status}` as MessageKey)
            : '',
        })}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        pending={statusMut.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null)
        }}
        onConfirm={() => {
          if (!pendingStatus) return
          statusMut.mutate({
            id: pendingStatus.id,
            status: pendingStatus.status,
          })
        }}
      />
    </PageLayout>
  )
}
