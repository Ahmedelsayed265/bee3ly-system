import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-lavender/80 text-ink',
  CONFIRMED: 'bg-brand/15 text-brand',
  COMPLETED: 'bg-trust/15 text-trust',
  CANCELLED: 'bg-muted/20 text-muted',
  RETURNED: 'bg-alert/15 text-alert',
};

type OrderStatusBadgeProps = {
  status: string;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useLocale();
  const style = STATUS_STYLE[status] ?? 'bg-lavender text-ink';
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        style,
      )}
    >
      {t(`orderStatus_${status}` as MessageKey)}
    </span>
  );
}
