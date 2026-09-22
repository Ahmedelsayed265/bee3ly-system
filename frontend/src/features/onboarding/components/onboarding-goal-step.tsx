import { InputField } from '@/components/ui/input-field';
import type { BusinessGoal } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { ONBOARDING_GOALS } from '@/features/onboarding/hooks/use-onboarding';

type OnboardingGoalStepProps = {
  operatingArea: string;
  primaryGoal: BusinessGoal;
  onOperatingAreaChange: (value: string) => void;
  onPrimaryGoalChange: (value: BusinessGoal) => void;
};

export function OnboardingGoalStep({
  operatingArea,
  primaryGoal,
  onOperatingAreaChange,
  onPrimaryGoalChange,
}: OnboardingGoalStepProps) {
  const { t } = useLocale();

  return (
    <>
      <InputField
        id="area"
        label={t('onboardingArea')}
        placeholder={t('onboardingAreaPlaceholder')}
        value={operatingArea}
        onChange={(e) => onOperatingAreaChange(e.target.value)}
      />
      <div className="space-y-1.5">
        <label className="text-ink text-sm font-medium">
          {t('onboardingGoal')}
        </label>
        <div className="grid gap-2">
          {ONBOARDING_GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => onPrimaryGoalChange(goal)}
              className={`rounded-xl border px-3 py-2.5 text-start text-sm ${
                primaryGoal === goal
                  ? 'border-brand bg-brand/10 text-ink'
                  : 'border-border bg-page text-muted hover:bg-lavender'
              }`}
            >
              {t(`goal_${goal}`)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
