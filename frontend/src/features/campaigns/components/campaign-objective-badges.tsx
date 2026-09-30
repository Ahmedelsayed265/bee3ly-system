import type { Campaign } from '@/features/business/api';
import { campaignGoalsList } from '@/features/campaigns/constants';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export function CampaignObjectiveBadges({
  campaign,
}: {
  campaign: Pick<Campaign, 'objective' | 'objectives'>;
}) {
  const { t } = useLocale();
  const goals = campaignGoalsList(campaign);

  return (
    <>
      {goals.map((goal) => (
        <span
          key={goal}
          className="bg-page text-ink/80 rounded-full px-2.5 py-1 text-[11px] font-medium"
        >
          {t(`campaignObj_${goal}` as MessageKey)}
        </span>
      ))}
    </>
  );
}
