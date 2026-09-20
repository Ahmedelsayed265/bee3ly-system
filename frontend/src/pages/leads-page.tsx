import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  fetchLeads,
  updateLeadStatus,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'

const STATUSES = ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'] as const

export function LeadsPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: fetchLeads })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateLeadStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  return (
    <PageLayout title={t('navLeads')} description={t('leadsIntro')}>
      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(leadsQuery.data ?? []).map((lead) => (
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
                  {lead.intent ?? '—'} · {lead.customer.phone ?? '—'}
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
                  onClick={() => statusMut.mutate({ id: lead.id, status: s })}
                >
                  {t(`leadStatus_${s}` as MessageKey)}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {leadsQuery.data?.length === 0 ? (
        <p className="text-sm text-muted">{t('noLeads')}</p>
      ) : null}
    </PageLayout>
  )
}
