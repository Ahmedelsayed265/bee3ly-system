import { Button } from '@/components/ui/button';
import {
  OBJECTIVES,
  toggleCampaignObjective,
  type CampaignObjective,
} from '@/features/campaigns/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type CampaignGoalStepProps = {
  objectives: CampaignObjective[];
  onObjectivesChange: (value: CampaignObjective[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function CampaignGoalStep({
  objectives,
  onObjectivesChange,
  onBack,
  onNext,
}: CampaignGoalStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-ink text-lg font-semibold">
          {t('campaignStepGoal')}
        </h2>
        <p className="text-muted mt-1 text-sm">{t('campaignGoalMultiHint')}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {OBJECTIVES.map((o) => {
          const active = objectives.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() =>
                onObjectivesChange(toggleCampaignObjective(objectives, o))
              }
              className={cn(
                'rounded-xl border px-3 py-3 text-start text-sm transition',
                active
                  ? 'border-brand bg-brand/10 ring-brand/30 ring-1'
                  : 'border-border hover:bg-lavender',
              )}
            >
              <span className="text-ink font-semibold">
                {t(`campaignObj_${o}` as MessageKey)}
              </span>
              <span className="text-muted mt-1 block text-xs">
                {t(`campaignMetrics_${o}` as MessageKey)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button disabled={objectives.length === 0} onClick={onNext}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
