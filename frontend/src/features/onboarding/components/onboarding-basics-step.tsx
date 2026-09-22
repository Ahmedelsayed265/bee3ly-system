import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type OnboardingBasicsStepProps = {
  description: string;
  averagePriceEgp: string;
  onDescriptionChange: (value: string) => void;
  onAveragePriceChange: (value: string) => void;
};

export function OnboardingBasicsStep({
  description,
  averagePriceEgp,
  onDescriptionChange,
  onAveragePriceChange,
}: OnboardingBasicsStepProps) {
  const { t } = useLocale();

  return (
    <>
      <InputField
        id="description"
        label={t('onboardingWhatSell')}
        placeholder={t('onboardingWhatSellPlaceholder')}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
      <InputField
        id="avgPrice"
        type="number"
        label={t('onboardingAvgPrice')}
        placeholder="750"
        value={averagePriceEgp}
        onChange={(e) => onAveragePriceChange(e.target.value)}
      />
    </>
  );
}
