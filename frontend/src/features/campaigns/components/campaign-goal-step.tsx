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
    <div className="space-y-4">
      <p className="text-muted text-sm">{t('campaignStepGoal')}</p>
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
            {t(`campaignObj_${o}` as MessageKey)}
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
