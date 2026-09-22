import { Button } from '@/components/ui/button';
import type { Campaign } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

type CampaignReadyStepProps = {
  campaign: Campaign;
  notice: string | null;
  isLaunching: boolean;
  onRequestLaunch: (status: 'ASSISTED_LAUNCH' | 'SIMULATED') => void;
  onReset: () => void;
};

export function CampaignReadyStep({
  campaign,
  notice,
  isLaunching,
  onRequestLaunch,
  onReset,
}: CampaignReadyStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <div className="bg-trust/10 text-trust rounded-xl px-4 py-3 text-sm font-semibold">
        {t('campaignReady')}
      </div>
      <div className="border-border bg-page space-y-2 rounded-xl border p-4 text-sm">
        <p>
          <span className="text-muted">{t('campaignName')}: </span>
          {campaign.name}
        </p>
        <p>
          <span className="text-muted">{t('campaignOfferLabel')}: </span>
          {campaign.offer}
        </p>
        <p>
          <span className="text-muted">{t('campaignAudienceLabel')}: </span>
          {campaign.audienceDescription}
        </p>
        <p>
          <span className="text-muted">{t('campaignBudgetLabel')}: </span>
          {campaign.budget.toLocaleString()} ج.م
        </p>
        {campaign.suggestedMessaging ? (
          <p>
            <span className="text-muted">{t('campaignMessaging')}: </span>
            {campaign.suggestedMessaging}
          </p>
        ) : null}
        {campaign.suggestedCta ? (
          <p>
            <span className="text-muted">CTA: </span>
            {campaign.suggestedCta}
          </p>
        ) : null}
        <p className="text-muted text-xs">{t('campaignNoFakePublish')}</p>
      </div>
      {notice ? <p className="text-muted text-sm">{notice}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onRequestLaunch('ASSISTED_LAUNCH')}
          disabled={isLaunching}
        >
          {t('campaignAssistedLaunch')}
        </Button>
        <Button
          variant="outline"
          onClick={() => onRequestLaunch('SIMULATED')}
          disabled={isLaunching}
        >
          {t('campaignSimulate')}
        </Button>
        <Button variant="ghost" onClick={onReset}>
          {t('campaignNew')}
        </Button>
      </div>
    </div>
  );
}
