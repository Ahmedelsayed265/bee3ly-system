import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/page-layout';
import { CampaignFilterBanner } from '@/features/campaigns/components/campaign-filter-banner';
import { OrderConfirmDialog } from '@/features/orders/components/order-confirm-dialog';
import { OrderDetailDialog } from '@/features/orders/components/order-detail-dialog';
import { OrdersTable } from '@/features/orders/components/orders-table';
import { useOrders } from '@/features/orders/hooks/use-orders';
import { useLocale } from '@/features/i18n/locale-context';

export function OrdersPageView() {
  const { t } = useLocale();
  const orders = useOrders();
  const [params] = useSearchParams();
  const campaignId = params.get('campaignId');
  const showEmpty =
    !orders.isLoading &&
    orders.total === 0 &&
    !orders.hasFilters &&
    !orders.isFetching &&
    !campaignId;

  return (
    <PageLayout title={t('navOrders')} description={t('ordersIntro')}>
      <CampaignFilterBanner />
      {showEmpty ? (
        <p className="text-muted text-sm">{t('noOrders')}</p>
      ) : (
        <OrdersTable
          orders={orders.orders}
          counts={orders.counts}
          productOptions={orders.productOptions}
          page={orders.page}
          totalPages={orders.totalPages}
          isLoading={orders.isLoading}
          isFetching={orders.isFetching}
          isStatusPending={orders.isStatusPending}
          status={orders.status}
          productId={orders.productId}
          query={orders.query}
          money={orders.money}
          onStatusFilter={orders.setStatus}
          onProductFilter={orders.setProductId}
          onQuery={orders.setQuery}
          onClearFilters={orders.clearFilters}
          onView={orders.setViewing}
          onAsk={orders.ask}
          onPage={orders.setPage}
        />
      )}

      <OrderDetailDialog
        order={orders.viewing}
        locale={orders.locale}
        isStatusPending={orders.isStatusPending}
        money={orders.money}
        onOpenChange={(open) => {
          if (!open) orders.setViewing(null);
        }}
        onAsk={orders.ask}
      />

      <OrderConfirmDialog
        pendingAction={orders.pendingAction}
        isPending={orders.isStatusPending}
        onOpenChange={(open) => {
          if (!open) orders.setPendingAction(null);
        }}
        onConfirm={() => {
          if (!orders.pendingAction) return;
          orders.updateStatus({
            id: orders.pendingAction.order.id,
            status: orders.pendingAction.status,
          });
        }}
      />
    </PageLayout>
  );
}
