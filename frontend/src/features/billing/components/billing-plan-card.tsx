import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlanTier } from '@/features/business/api';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type BillingPlanCardProps = {
  id: PlanTier;
  priceKey: MessageKey;
  featureKeys: MessageKey[];
  highlight?: boolean;
  active: boolean;
  isPending: boolean;
  onSelect: (plan: PlanTier) => void;
  t: (key: MessageKey) => string;
};

export function BillingPlanCard({
  id,
  priceKey,
  featureKeys,
  highlight,
  active,
  isPending,
  onSelect,
  t,
}: BillingPlanCardProps) {
  return (
    <div
      className={cn(
        'bg-surface flex flex-col rounded-2xl border p-5 shadow-sm',
        highlight ? 'border-brand ring-brand/30 ring-1' : 'border-border',
        active && 'bg-lavender/40',
      )}
    >
      {highlight ? (
        <span className="bg-brand mb-2 w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white">
          {t('planPopular')}
        </span>
      ) : (
        <span className="mb-2 h-5" />
      )}
      <h2 className="text-ink text-lg font-bold">
        {t(`planName_${id}` as MessageKey)}
      </h2>
      <p className="text-ink mt-1 text-2xl font-bold">{t(priceKey)}</p>
      <ul className="mt-4 flex-1 space-y-2">
        {featureKeys.map((key) => (
          <li key={key} className="text-muted flex items-start gap-2 text-sm">
            <Check className="text-trust mt-0.5 h-4 w-4 shrink-0" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-5 w-full"
        variant={active ? 'secondary' : highlight ? 'default' : 'outline'}
        disabled={active || isPending}
        onClick={() => onSelect(id)}
      >
        {active ? t('planCurrent') : isPending ? t('saving') : t('planSelect')}
      </Button>
    </div>
  );
}
