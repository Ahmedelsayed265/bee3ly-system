import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type OnboardingDetailsStepProps = {
  showWorkingHours: boolean;
  workingHours: string;
  onWorkingHoursChange: (value: string) => void;
};

export function OnboardingDetailsStep({
  showWorkingHours,
  workingHours,
  onWorkingHoursChange,
}: OnboardingDetailsStepProps) {
  const { t } = useLocale();

  return (
    <>
      {showWorkingHours ? (
        <InputField
          id="hours"
          label={t('workingHours')}
          value={workingHours}
          onChange={(e) => onWorkingHoursChange(e.target.value)}
          placeholder={t('workingHoursPlaceholder')}
        />
      ) : (
        <p className="text-muted text-sm leading-6">
          {t('onboardingWorkingHoursSkip')}
        </p>
      )}
      <p className="text-muted text-xs leading-5">
        {t('knowledgeShippingNote')}
      </p>
    </>
  );
}
