import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import { OnboardingBasicsStep } from '@/features/onboarding/components/onboarding-basics-step';
import { OnboardingDetailsStep } from '@/features/onboarding/components/onboarding-details-step';
import { OnboardingGoalStep } from '@/features/onboarding/components/onboarding-goal-step';
import { useOnboarding } from '@/features/onboarding/hooks/use-onboarding';

export function OnboardingPageView() {
  const { t } = useLocale();
  const {
    step,
    setStep,
    description,
    setDescription,
    averagePriceEgp,
    setAveragePriceEgp,
    operatingArea,
    setOperatingArea,
    primaryGoal,
    setPrimaryGoal,
    deliveryInfo,
    setDeliveryInfo,
    workingHours,
    setWorkingHours,
    saving,
    finish,
  } = useOnboarding();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center">
      <p className="text-brand text-xs font-semibold tracking-wide uppercase">
        {t('onboardingStep', { step: String(step + 1), total: '3' })}
      </p>
      <h1 className="font-display text-ink mt-2 text-2xl font-bold">
        {t('onboardingTitle')}
      </h1>
      <p className="text-muted mt-1 text-sm">{t('onboardingSubtitle')}</p>

      <div className="border-border bg-surface mt-6 space-y-4 rounded-2xl border p-5">
        {step === 0 ? (
          <OnboardingBasicsStep
            description={description}
            averagePriceEgp={averagePriceEgp}
            onDescriptionChange={setDescription}
            onAveragePriceChange={setAveragePriceEgp}
          />
        ) : null}

        {step === 1 ? (
          <OnboardingGoalStep
            operatingArea={operatingArea}
            primaryGoal={primaryGoal}
            onOperatingAreaChange={setOperatingArea}
            onPrimaryGoalChange={setPrimaryGoal}
          />
        ) : null}

        {step === 2 ? (
          <OnboardingDetailsStep
            workingHours={workingHours}
            deliveryInfo={deliveryInfo}
            onWorkingHoursChange={setWorkingHours}
            onDeliveryInfoChange={setDeliveryInfo}
          />
        ) : null}

        <div className="flex gap-2 pt-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
            >
              {t('back')}
            </Button>
          ) : null}
          {step < 2 ? (
            <Button
              type="button"
              className="flex-1"
              onClick={() => setStep((s) => s + 1)}
            >
              {t('continue')}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
              disabled={saving}
              onClick={() => void finish()}
            >
              {saving ? t('saving') : t('finishOnboarding')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
