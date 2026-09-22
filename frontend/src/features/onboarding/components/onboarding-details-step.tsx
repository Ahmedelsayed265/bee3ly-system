import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type OnboardingDetailsStepProps = {
  workingHours: string;
  deliveryInfo: string;
  onWorkingHoursChange: (value: string) => void;
  onDeliveryInfoChange: (value: string) => void;
};

export function OnboardingDetailsStep({
  workingHours,
  deliveryInfo,
  onWorkingHoursChange,
  onDeliveryInfoChange,
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
      <InputField
        id="delivery"
        label={t('deliveryInfo')}
        value={deliveryInfo}
        onChange={(e) => onDeliveryInfoChange(e.target.value)}
      />
    </>
  );
}
