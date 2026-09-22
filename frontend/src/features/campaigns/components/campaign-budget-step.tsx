import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type CampaignBudgetStepProps = {
  budget: string;
  onBudgetChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function CampaignBudgetStep({
  budget,
  onBudgetChange,
  onBack,
  onNext,
}: CampaignBudgetStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">{t('campaignStepBudget')}</p>
      <InputField
        id="budget"
        type="number"
        label={t('campaignBudgetLabel')}
        value={budget}
        onChange={(e) => onBudgetChange(e.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button disabled={Number(budget) < 50} onClick={onNext}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
