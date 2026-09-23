import { Button } from '@/components/ui/button';
import {
  OBJECTIVES,
  type CampaignObjective,
} from '@/features/campaigns/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type CampaignGoalStepProps = {
  objective: CampaignObjective;
  onObjectiveChange: (value: CampaignObjective) => void;
  onBack: () => void;
  onNext: () => void;
};

export function CampaignGoalStep({
  objective,
  onObjectiveChange,
  onBack,
  onNext,
}: CampaignGoalStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <h2 className="text-ink text-lg font-semibold">
        {t('campaignStepGoal')}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {OBJECTIVES.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onObjectiveChange(o)}
            className={cn(
              'rounded-xl border px-3 py-3 text-start text-sm',
              objective === o
                ? 'border-brand bg-brand/10'
                : 'border-border hover:bg-lavender',
            )}
          >
            <span className="text-ink font-semibold">
              {t(`campaignObj_${o}` as MessageKey)}
            </span>
            {objective === o ? (
              <span className="text-muted mt-1 block text-xs">
                {t(`campaignMetrics_${o}` as MessageKey)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button onClick={onNext}>{t('next')}</Button>
      </div>
    </div>
  );
}
