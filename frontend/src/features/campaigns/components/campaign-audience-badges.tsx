import type { Campaign } from '@/features/business/api';
import { campaignAudienceList } from '@/features/campaigns/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export function CampaignAudienceBadges({
  campaign,
}: {
  campaign: Pick<Campaign, 'audienceDescription' | 'audiences'>;
}) {
  const { t } = useLocale();
  const segments = campaignAudienceList(campaign);
  if (segments.length === 0) {
    return (
      <span className="text-ink text-sm">{campaign.audienceDescription}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {segments.map((segment) => (
        <span
          key={segment}
          className="bg-page text-ink/80 rounded-full px-2.5 py-1 text-[11px] font-medium"
        >
          {t(`campaignAud_${segment}` as MessageKey)}
        </span>
      ))}
    </div>
  );
}
