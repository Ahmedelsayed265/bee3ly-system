import { Check, Crown, Leaf, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicPlan } from '@/features/billing/api';
import { cn } from '@/lib/utils';

type BillingPlanCardProps = {
  planId: PublicPlan;
  name: string;
  audience: string;
  amount: number;
  period: string;
  features: string[];
  highlight: boolean;
  popularLabel: string;
  cta: string;
  pending: boolean;
  active: boolean;
  onSelect: () => void;
};

const TONE: Record<
  PublicPlan,
  { icon: typeof Leaf; wrap: string; iconColor: string }
> = {
  STARTER: {
    icon: Leaf,
    wrap: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  GROWTH: {
    icon: Sparkles,
    wrap: 'bg-brand/10',
    iconColor: 'text-brand',
  },
  PRO: {
    icon: Crown,
    wrap: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
};

export function BillingPlanCard({
  planId,
  name,
  audience,
  amount,
  period,
  features,
  highlight,
  popularLabel,
  cta,
  pending,
  active,
  onSelect,
}: BillingPlanCardProps) {
  const tone = TONE[planId];
  const Icon = tone.icon;

  return (
    <article
      className={cn(
        'bg-surface relative flex flex-col rounded-3xl border p-5 shadow-sm',
        highlight ? 'border-brand border-2 shadow-lg' : 'border-border',
      )}
    >
      {highlight ? (
        <span className="bg-brand absolute top-0 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white">
          <Sparkles className="size-3.5" />
          {popularLabel}
        </span>
      ) : null}
      <span
        className={cn(
          'mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl',
          tone.wrap,
        )}
      >
        <Icon className={cn('size-5', tone.iconColor)} />
      </span>
      <h3 className="text-ink text-xl font-bold">{name}</h3>
      <p className="text-muted mt-1 text-sm">{audience}</p>
      <p className="mt-4 flex items-end gap-2">
        <span className="text-ink text-4xl font-bold tracking-tight">
          ${amount.toLocaleString()}
        </span>
        <span className="text-muted mb-1 text-sm">{period}</span>
      </p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="text-ink flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-6 w-full"
        variant={active ? 'secondary' : highlight ? 'default' : 'outline'}
        disabled={active || pending}
        onClick={onSelect}
      >
        {cta}
      </Button>
    </article>
  );
}
