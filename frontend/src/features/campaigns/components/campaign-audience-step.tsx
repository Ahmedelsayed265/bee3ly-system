import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type CampaignAudienceStepProps = {
  audience: string;
  onAudienceChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function CampaignAudienceStep({
  audience,
  onAudienceChange,
  onBack,
  onNext,
}: CampaignAudienceStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">{t('campaignStepAudience')}</p>
      <InputField
        id="audience"
        label={t('campaignAudienceLabel')}
        value={audience}
        onChange={(e) => onAudienceChange(e.target.value)}
        placeholder={t('campaignAudiencePlaceholder')}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button disabled={audience.trim().length < 2} onClick={onNext}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
