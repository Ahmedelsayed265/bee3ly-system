import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from '@/features/leads/constants';

type LeadCardProps = {
  lead: Lead;
  isPending: boolean;
  onStatusClick: (status: LeadStatus) => void;
};

export function LeadCard({ lead, isPending, onStatusClick }: LeadCardProps) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface space-y-3 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-ink font-semibold">
            {lead.customer.name ?? t('unknownCustomer')}
          </p>
          <p className="text-muted text-sm">
            {lead.intent ? t(`leadIntent_${lead.intent}` as MessageKey) : '—'} ·{' '}
            {lead.customer.phone ?? '—'}
          </p>
        </div>
        <span className="bg-lavender rounded-full px-2.5 py-1 text-xs font-semibold">
          {t(`leadStatus_${lead.status}` as MessageKey)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {LEAD_STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={lead.status === s ? 'default' : 'outline'}
            className="h-7 text-[11px]"
            disabled={isPending || lead.status === s}
            onClick={() => onStatusClick(s)}
          >
            {t(`leadStatus_${s}` as MessageKey)}
          </Button>
        ))}
      </div>
    </div>
  );
}
