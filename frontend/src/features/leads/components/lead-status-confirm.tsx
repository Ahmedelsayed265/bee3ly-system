import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import type { PendingLeadStatus } from '@/features/leads/constants';

type LeadStatusConfirmProps = {
  pending: PendingLeadStatus | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function LeadStatusConfirm({
  pending,
  isPending,
  onOpenChange,
  onConfirm,
}: LeadStatusConfirmProps) {
  const { t } = useLocale();

  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title={t('confirmLeadStatusTitle')}
      description={t('confirmLeadStatusBody', {
        customer: pending?.customer ?? '',
        status: pending ? t(`leadStatus_${pending.status}` as MessageKey) : '',
      })}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
      pending={isPending}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
