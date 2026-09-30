import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { InputField } from '@/components/ui/input-field';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { SelectField } from '@/components/ui/select-field';
import { TableRowsSkeleton } from '@/components/ui/skeleton-blocks';
import type { OrderRow, Product } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  ORDER_STATUSES,
  type OrderCounts,
  type OrderStatusAction,
  type OrderStatusFilter,
} from '@/features/orders/constants';
import { OrderRowActions } from '@/features/orders/components/order-row-actions';
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge';

type OrdersTableProps = {
  orders: OrderRow[];
  counts: OrderCounts;
  productOptions: Product[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  isFetching: boolean;
  isStatusPending: boolean;
  status: OrderStatusFilter | '';
  productId: string;
  query: string;
  money: (value: number) => string;
  onStatusFilter: (status: OrderStatusFilter | '') => void;
  onProductFilter: (productId: string) => void;
  onQuery: (query: string) => void;
  onClearFilters: () => void;
  onView: (order: OrderRow) => void;
  onAsk: (order: OrderRow, status: OrderStatusAction) => void;
  onPage: (page: number) => void;
};

export function OrdersTable({
  orders,
  counts,
  productOptions,
  page,
  totalPages,
  isLoading,
  isFetching,
  isStatusPending,
  status,
  productId,
  query,
  money,
  onStatusFilter,
  onProductFilter,
  onQuery,
  onClearFilters,
  onView,
  onAsk,
  onPage,
}: OrdersTableProps) {
  const { t } = useLocale();
  const allCount = ORDER_STATUSES.reduce((sum, key) => sum + counts[key], 0);
  const hasFilters = Boolean(status || productId || query.trim());

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="border-border/70 bg-surface w-full overflow-hidden rounded-[1.75rem] border">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label={t('orderFilterAll')}
              count={allCount}
              active={status === ''}
              onClick={() => onStatusFilter('')}
            />
            {ORDER_STATUSES.map((item) => (
              <FilterChip
                key={item}
                label={t(`orderStatus_${item}` as MessageKey)}
                count={counts[item]}
                active={status === item}
                onClick={() => onStatusFilter(item)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InputField
              icon={Search}
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={t('orderSearchPlaceholder')}
              containerClassName="min-w-56 flex-1"
              aria-label={t('orderSearchPlaceholder')}
            />
            <div className="w-full sm:w-56">
              <SelectField
                value={productId || 'ALL'}
                onValueChange={(value) =>
                  onProductFilter(value === 'ALL' ? '' : value)
                }
                placeholder={t('orderFilterProduct')}
                options={[
                  { value: 'ALL', label: t('orderFilterAllProducts') },
                  ...productOptions.map((product) => ({
                    value: product.id,
                    label: product.name,
                  })),
                ]}
              />
            </div>
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
              >
                {t('leadClearFilters')}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border-border overflow-x-auto border-t">
          <table className="w-full min-w-180 border-collapse text-sm">
            <thead>
              <tr className="border-border bg-canvas/60 text-muted border-b text-xs font-semibold tracking-wide uppercase">
                <th className="px-4 py-3 text-start">{t('orderColNumber')}</th>
                <th className="px-4 py-3 text-start">
                  {t('orderColCustomer')}
                </th>
                <th className="px-4 py-3 text-start">{t('orderColPhone')}</th>
                <th className="px-4 py-3 text-start">{t('orderColItems')}</th>
                <th className="px-4 py-3 text-start">{t('orderColTotal')}</th>
                <th className="px-4 py-3 text-start">{t('orderColStatus')}</th>
                <th className="px-4 py-3 text-start">{t('orderColActions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRowsSkeleton rows={8} cols={7} />
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted px-4 py-10 text-center text-sm"
                  >
                    {hasFilters ? t('ordersFilteredEmpty') : t('noOrders')}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
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
                    <td className="px-4 py-3 text-start align-top">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-start align-top">
                      <OrderRowActions
                        order={o}
                        disabled={isStatusPending}
                        onView={() => onView(o)}
                        onAsk={(next) => onAsk(o, next)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
