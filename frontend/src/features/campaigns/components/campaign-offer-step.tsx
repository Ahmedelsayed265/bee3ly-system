import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { useLocale } from '@/features/i18n/locale-context';

type CampaignOfferStepProps = {
  offer: string;
  onOfferChange: (value: string) => void;
  onNext: () => void;
};

export function CampaignOfferStep({
  offer,
  onOfferChange,
  onNext,
}: CampaignOfferStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">{t('campaignStepOffer')}</p>
      <InputField
        id="offer"
        label={t('campaignOfferLabel')}
        value={offer}
        onChange={(e) => onOfferChange(e.target.value)}
        placeholder={t('campaignOfferPlaceholder')}
      />
      <Button disabled={offer.trim().length < 2} onClick={onNext}>
        {t('next')}
      </Button>
    </div>
  );
}
