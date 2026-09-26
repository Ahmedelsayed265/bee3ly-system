import { Button } from '@/components/ui/button';
import {
  AUDIENCES,
  type CampaignAudience,
} from '@/features/campaigns/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

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
    <div className="space-y-5">
      <h2 className="text-ink text-lg font-semibold">
        {t('campaignStepAudience')}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {AUDIENCES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onAudienceChange(option)}
            className={cn(
              'rounded-xl border px-3 py-3 text-start text-sm',
              audience === option
                ? 'border-brand bg-brand/10'
                : 'border-border hover:bg-lavender',
            )}
          >
            <span className="text-ink font-semibold">
              {t(`campaignAud_${option}` as MessageKey)}
            </span>
          </button>
        ))}
      </div>
      {audience === ('CUSTOMERS' satisfies CampaignAudience) ? (
        <p className="text-muted text-xs">{t('campaignAudienceNotice')}</p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          {t('back')}
        </Button>
        <Button disabled={!audience} onClick={onNext}>
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
