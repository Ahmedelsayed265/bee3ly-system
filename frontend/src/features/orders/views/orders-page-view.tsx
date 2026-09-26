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

  return (
    <PageLayout title={t('navOrders')} description={t('ordersIntro')}>
      <CampaignFilterBanner />
      {orders.total === 0 && !orders.isLoading ? (
        <p className="text-muted text-sm">
          {campaignId ? t('campaignFilteredEmpty') : t('noOrders')}
        </p>
      ) : (
        <OrdersTable
          orders={orders.orders}
          page={orders.page}
          totalPages={orders.totalPages}
          isFetching={orders.isFetching}
          isStatusPending={orders.isStatusPending}
          money={orders.money}
          onView={orders.setViewing}
          onAsk={orders.ask}
          onPage={orders.setPage}
        />
      )}

      <OrderDetailDialog
        order={orders.viewing}
        locale={orders.locale}
        isStatusPending={orders.isStatusPending}
        isPlacing={orders.isPlacing}
        money={orders.money}
        onOpenChange={(open) => {
          if (!open) orders.setViewing(null);
        }}
        onAsk={orders.ask}
        onGovernorate={orders.setGovernorate}
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
