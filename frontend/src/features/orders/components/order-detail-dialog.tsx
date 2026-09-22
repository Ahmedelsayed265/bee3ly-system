import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OrderRow } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { canCancel, canConfirm } from '@/features/orders/hooks/use-orders';

type OrderDetailDialogProps = {
  order: OrderRow | null;
  locale: string;
  isStatusPending: boolean;
  money: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onAsk: (order: OrderRow, status: 'CONFIRMED' | 'CANCELLED') => void;
};

export function OrderDetailDialog({
  order,
  locale,
  isStatusPending,
  money,
  onOpenChange,
  onAsk,
}: OrderDetailDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog
      open={Boolean(order)}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {order ? `#${order.orderNumber}` : t('viewOrder')}
          </DialogTitle>
          <DialogDescription>{t('orderDetailsHint')}</DialogDescription>
        </DialogHeader>
        {order ? (
          <>
            <DialogBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted text-xs">{t('orderColCustomer')}</p>
                  <p className="text-ink mt-1 text-sm font-semibold">
                    {order.customerName ?? t('unknownCustomer')}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">{t('orderColPhone')}</p>
                  <p className="text-ink mt-1 text-sm font-semibold tabular-nums">
                    {order.customerPhone ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">{t('orderColDate')}</p>
                  <p className="text-ink mt-1 text-sm font-semibold">
                    {new Date(order.createdAt).toLocaleString(
                      locale === 'ar' ? 'ar-EG' : 'en-US',
                      { dateStyle: 'medium', timeStyle: 'short' },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">{t('orderColStatus')}</p>
                  <p className="mt-1">
                    <span className="bg-lavender text-ink inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                      {t(`orderStatus_${order.status}` as MessageKey)}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted text-xs">{t('orderColItems')}</p>
                <ul className="divide-border border-border mt-2 divide-y rounded-xl border">
                  {order.items.map((item, index) => (
                    <li
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <span className="text-ink">
                        {item.name}
                        {item.size ? ` (${item.size})` : ''} × {item.quantity}
                      </span>
                      <span className="text-ink shrink-0 font-medium tabular-nums">
                        {money(item.priceEgp * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-page flex items-center justify-between rounded-xl px-3 py-2.5">
                <span className="text-muted text-sm">{t('orderColTotal')}</span>
                <span className="text-ink text-base font-bold tabular-nums">
                  {money(order.totalEgp)}
                </span>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={!canCancel(order.status) || isStatusPending}
                onClick={() => onAsk(order, 'CANCELLED')}
              >
                {t('cancelOrder')}
              </Button>
              <Button
                type="button"
                disabled={!canConfirm(order.status) || isStatusPending}
                onClick={() => onAsk(order, 'CONFIRMED')}
              >
                {t('confirmOrderShort')}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
