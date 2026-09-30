import { Button } from '@/components/ui/button';
import {
  AUDIENCES,
  toggleCampaignAudience,
  type CampaignAudience,
} from '@/features/campaigns/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type CampaignAudienceStepProps = {
  audiences: CampaignAudience[];
  onAudiencesChange: (value: CampaignAudience[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function CampaignAudienceStep({
  audiences,
  onAudiencesChange,
  onBack,
  onNext,
}: CampaignAudienceStepProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-ink text-lg font-semibold">
          {t('campaignStepAudience')}
        </h2>
        <p className="text-muted mt-1 text-sm">
          {t('campaignAudienceMultiHint')}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {AUDIENCES.map((option) => {
          const active = audiences.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onAudiencesChange(toggleCampaignAudience(audiences, option))
              }
              className={cn(
                'rounded-xl border px-3 py-3 text-start text-sm transition',
                active
                  ? 'border-brand bg-brand/10 ring-brand/30 ring-1'
                  : 'border-border hover:bg-lavender',
              )}
            >
              <span className="text-ink font-semibold">
                {t(`campaignAud_${option}` as MessageKey)}
              </span>
            </button>
          );
        })}
      </div>
      {audiences.includes('CUSTOMERS') ? (
        <p className="text-muted text-xs">{t('campaignAudienceNotice')}</p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button disabled={audiences.length === 0} onClick={onNext}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
