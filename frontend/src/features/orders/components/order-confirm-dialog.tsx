import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { OrderRow } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

type PendingAction = {
  order: OrderRow;
  status: 'CONFIRMED' | 'CANCELLED' | 'RETURNED';
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
            : t('confirmOrderTitle')
      }
      description={
        pendingAction
          ? t(
              pendingAction.status === 'CANCELLED'
                ? 'cancelOrderBody'
                : pendingAction.status === 'RETURNED'
                  ? 'returnOrderBody'
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
