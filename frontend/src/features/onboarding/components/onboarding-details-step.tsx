import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type OnboardingDetailsStepProps = {
  workingHours: string;
  onWorkingHoursChange: (value: string) => void;
};

export function OnboardingDetailsStep({
  workingHours,
  onWorkingHoursChange,
}: OnboardingDetailsStepProps) {
  const { t } = useLocale();

  return (
    <>
      <InputField
        id="hours"
        label={t('workingHours')}
        value={workingHours}
        onChange={(e) => onWorkingHoursChange(e.target.value)}
      />
      <p className="text-muted text-xs leading-5">{t('knowledgeShippingNote')}</p>
    </>
  );
}
