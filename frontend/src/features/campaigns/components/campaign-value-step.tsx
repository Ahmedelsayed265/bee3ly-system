import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type CampaignValueStepProps = {
  valueProp: string;
  onValuePropChange: (value: string) => void;
  isPending: boolean;
  onBack: () => void;
  onGenerate: () => void;
};

export function CampaignValueStep({
  valueProp,
  onValuePropChange,
  isPending,
  onBack,
  onGenerate,
}: CampaignValueStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <h2 className="text-ink text-lg font-semibold">
        {t('campaignStepValue')}
      </h2>
      <InputField
        id="valueProp"
        label={t('campaignValueLabel')}
        value={valueProp}
        onChange={(e) => onValuePropChange(e.target.value)}
        placeholder={t('campaignValuePlaceholder')}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button disabled={isPending} onClick={onGenerate}>
          {t('campaignGenerate')}
        </Button>
      </div>
    </div>
  );
}
