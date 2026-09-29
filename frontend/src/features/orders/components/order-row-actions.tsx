import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OrderRow } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import type { OrderStatusAction } from '@/features/orders/constants';
import {
  canCancel,
  canComplete,
  canConfirm,
  canReturn,
} from '@/features/orders/hooks/use-orders';
import { cn } from '@/lib/utils';

const ACTION_LABEL: Record<OrderStatusAction, MessageKey> = {
  CONFIRMED: 'confirmOrderShort',
  COMPLETED: 'completeOrderShort',
  CANCELLED: 'cancelOrder',
  RETURNED: 'returnOrder',
};

type OrderRowActionsProps = {
  order: OrderRow;
  disabled?: boolean;
  onView: () => void;
  onAsk: (status: OrderStatusAction) => void;
};

export function OrderRowActions({
  order,
  disabled,
  onView,
  onAsk,
}: OrderRowActionsProps) {
  const { t } = useLocale();

  type StatusActionCandidate = {
    action: OrderStatusAction;
    enabled: boolean;
    destructive?: boolean;
  };

  const statusActions = (
    [
      { action: 'CONFIRMED', enabled: canConfirm(order.status) },
      { action: 'COMPLETED', enabled: canComplete(order.status) },
      { action: 'RETURNED', enabled: canReturn(order.status) },
      {
        action: 'CANCELLED',
        enabled: canCancel(order.status),
        destructive: true,
      },
    ] satisfies StatusActionCandidate[]
  )
    .filter((row) => row.enabled)
    .map(({ action, destructive }) => ({ action, destructive }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 shrink-0 px-0"
          disabled={disabled}
          aria-label={t('orderMoreActions')}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem
          className="cursor-pointer text-xs font-medium"
          onSelect={onView}
        >
          {t('viewOrder')}
        </DropdownMenuItem>
        {statusActions.length > 0 ? <DropdownMenuSeparator /> : null}
        {statusActions.map((row, index) => (
          <div key={row.action}>
            {row.destructive && index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className={cn(
                'cursor-pointer text-xs font-medium',
                row.destructive && 'text-danger focus:text-danger',
              )}
              onSelect={() => onAsk(row.action)}
            >
              {t(ACTION_LABEL[row.action])}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
