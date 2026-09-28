import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { OrderRow } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

import type { OrderStatusAction } from '@/features/orders/constants';

type PendingAction = {
  order: OrderRow;
  status: OrderStatusAction;
} | null;

type OrderConfirmDialogProps = {
  pendingAction: PendingAction;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function OrderConfirmDialog({
  pendingAction,
  isPending,
  onOpenChange,
  onConfirm,
}: OrderConfirmDialogProps) {
  const { t } = useLocale();

  return (
    <ConfirmDialog
      open={Boolean(pendingAction)}
      title={
        pendingAction?.status === 'CANCELLED'
          ? t('cancelOrderTitle')
          : pendingAction?.status === 'RETURNED'
            ? t('returnOrderTitle')
            : pendingAction?.status === 'COMPLETED'
              ? t('completeOrderTitle')
              : t('confirmOrderTitle')
      }
      description={
        pendingAction
          ? t(
              pendingAction.status === 'CANCELLED'
                ? 'cancelOrderBody'
                : pendingAction.status === 'RETURNED'
                  ? 'returnOrderBody'
                  : pendingAction.status === 'COMPLETED'
                    ? 'completeOrderBody'
                    : 'confirmOrderBody',
              {
                number: String(pendingAction.order.orderNumber),
                customer:
                  pendingAction.order.customerName ?? t('unknownCustomer'),
              },
            )
          : ''
      }
      confirmLabel={
        pendingAction?.status === 'CANCELLED'
          ? t('cancelOrder')
          : pendingAction?.status === 'RETURNED'
            ? t('returnOrder')
            : pendingAction?.status === 'COMPLETED'
              ? t('completeOrder')
              : t('confirmOrder')
      }
      cancelLabel={t('back')}
      pending={isPending}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      onConfirm={onConfirm}
    />
  );
}
