import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/ui/pagination-bar';
import type { OrderRow } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  canCancel,
  canConfirm,
  canReturn,
} from '@/features/orders/hooks/use-orders';

type OrdersTableProps = {
  orders: OrderRow[];
  page: number;
  totalPages: number;
  isFetching: boolean;
  isStatusPending: boolean;
  money: (value: number) => string;
  onView: (order: OrderRow) => void;
  onAsk: (
    order: OrderRow,
    status: 'CONFIRMED' | 'CANCELLED' | 'RETURNED',
  ) => void;
  onPage: (page: number) => void;
};

export function OrdersTable({
  orders,
  page,
  totalPages,
  isFetching,
  isStatusPending,
  money,
  onView,
  onAsk,
  onPage,
}: OrdersTableProps) {
  const { t } = useLocale();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="border-border bg-surface w-full overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-180 border-collapse text-sm">
          <thead>
            <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold tracking-wide uppercase">
              <th className="px-4 py-3 text-start">{t('orderColNumber')}</th>
              <th className="px-4 py-3 text-start">{t('orderColCustomer')}</th>
              <th className="px-4 py-3 text-start">{t('orderColPhone')}</th>
              <th className="px-4 py-3 text-start">{t('orderColItems')}</th>
              <th className="px-4 py-3 text-start">{t('orderColTotal')}</th>
              <th className="px-4 py-3 text-start">{t('orderColStatus')}</th>
              <th className="px-4 py-3 text-start">{t('orderColActions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-border hover:bg-canvas/40 border-b last:border-b-0"
              >
                <td className="text-ink px-4 py-3 text-start font-semibold">
                  #{o.orderNumber}
                </td>
                <td className="text-ink px-4 py-3 text-start">
                  {o.customerName ?? t('unknownCustomer')}
                </td>
                <td className="text-muted px-4 py-3 text-start tabular-nums">
                  {o.customerPhone ?? '—'}
                </td>
                <td className="text-ink max-w-70 px-4 py-3 text-start">
                  {o.items
                    .map(
                      (item) =>
                        `${item.name}${item.size ? ` (${item.size})` : ''} × ${item.quantity}`,
                    )
                    .join(' · ')}
                </td>
                <td className="text-ink px-4 py-3 text-start font-medium tabular-nums">
                  {money(o.totalEgp)}
                </td>
                <td className="px-4 py-3 text-start">
                  <span className="bg-lavender text-ink inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                    {t(`orderStatus_${o.status}` as MessageKey)}
                  </span>
                </td>
                <td className="px-4 py-3 text-start">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => onView(o)}
                    >
                      {t('viewOrder')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      disabled={!canReturn(o.status) || isStatusPending}
                      onClick={() => onAsk(o, 'RETURNED')}
                    >
                      {t('returnOrder')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      disabled={!canCancel(o.status) || isStatusPending}
                      onClick={() => onAsk(o, 'CANCELLED')}
                    >
                      {t('cancelOrder')}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      disabled={!canConfirm(o.status) || isStatusPending}
                      onClick={() => onAsk(o, 'CONFIRMED')}
                    >
                      {t('confirmOrderShort')}
                    </Button>
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
