import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { fetchOrders, updateOrderStatus } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'

export function OrdersPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['orders'] })
      await qc.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  return (
    <PageLayout title={t('navOrders')} description={t('ordersIntro')}>
      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(ordersQuery.data ?? []).map((o) => (
          <div
            key={o.id}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  #{o.orderNumber} · {o.customerName ?? t('unknownCustomer')}
                </p>
                <p className="text-sm text-muted">
                  {o.customerPhone ?? '—'} · {o.totalEgp.toLocaleString()} ج.م
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {o.items.map((item, i) => (
                    <li key={i}>
                      {item.name}
                      {item.size ? ` (${item.size})` : ''} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold text-ink">
                  {t(`orderStatus_${o.status}` as MessageKey)}
                </span>
                {o.status === 'PENDING' ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      statusMut.mutate({ id: o.id, status: 'CONFIRMED' })
                    }
                  >
                    {t('confirmOrder')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      {ordersQuery.data?.length === 0 ? (
        <p className="text-sm text-muted">{t('noOrders')}</p>
      ) : null}
    </PageLayout>
  )
}
