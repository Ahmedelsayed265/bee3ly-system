import { useQuery } from '@tanstack/react-query'
import { PageLayout } from '@/components/layout/page-layout'
import { fetchLeads } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'

export function LeadsPage() {
  const { t } = useLocale()
  const leadsQuery = useQuery({ queryKey: ['leads'], queryFn: fetchLeads })

  return (
    <PageLayout title={t('navLeads')} description={t('leadsIntro')}>
      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(leadsQuery.data ?? []).map((lead) => (
          <div
            key={lead.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
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
        ))}
      </div>
      {leadsQuery.data?.length === 0 ? (
        <p className="text-sm text-muted">{t('noLeads')}</p>
      ) : null}
    </PageLayout>
  )
}
