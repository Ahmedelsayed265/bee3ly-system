import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Campaign } from '@/features/business/api';
import { CampaignScorecard } from '@/features/campaigns/components/campaign-scorecard';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';

type CampaignStatusAction =
  'ASSISTED_LAUNCH' | 'SIMULATED' | 'PAUSED' | 'ARCHIVED';

type CampaignDetailProps = {
  campaign: Campaign;
  isBusy: boolean;
  onStatus: (status: CampaignStatusAction) => void;
};

export function CampaignDetail({
  campaign,
  isBusy,
  onStatus,
}: CampaignDetailProps) {
  const { t } = useLocale();
  const running =
    campaign.status === 'ASSISTED_LAUNCH' ||
    campaign.status === 'SIMULATED' ||
    campaign.status === 'ACTIVE';
  const canLaunch = campaign.status === 'READY' || campaign.status === 'DRAFT';
  const query = `campaignId=${campaign.id}&campaign=${encodeURIComponent(campaign.name)}`;

  const facts = [
    { label: t('campaignOfferLabel'), value: campaign.offer },
    { label: t('campaignAudienceLabel'), value: campaign.audienceDescription },
    { label: t('campaignValueLabel'), value: campaign.valueProposition },
    { label: t('campaignMessaging'), value: campaign.suggestedMessaging },
    { label: t('campaignCta'), value: campaign.suggestedCta },
    { label: t('campaignCreative'), value: campaign.suggestedCreative },
  ].filter((item) => item.value);

  return (
    <article className="border-border/70 bg-surface relative overflow-hidden rounded-[1.75rem] border p-5">
      <div className="bg-brand/10 pointer-events-none absolute -inset-s-10 -top-12 h-32 w-32 rounded-full blur-2xl" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="bg-brand/10 text-brand inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold">
                {t(`campaignStatus_${campaign.status}` as MessageKey)}
              </span>
              <span className="bg-page text-ink/80 rounded-full px-2.5 py-1 text-[11px] font-medium">
                {t(`campaignObj_${campaign.objective}` as MessageKey)}
              </span>
            </div>
            <h2 className="text-ink text-lg font-bold">{campaign.name}</h2>
            <p className="text-muted mt-1 text-sm">
              {t(`campaignMetrics_${campaign.objective}` as MessageKey)}
            </p>
          </div>
        </div>

        <CampaignScorecard campaign={campaign} />

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to={`${paths.inbox}?${query}`}>
              {t('metricConversations')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to={`${paths.leads}?${query}`}>{t('metricLeads')}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to={`${paths.orders}?${query}`}>{t('metricOrders')}</Link>
          </Button>
        </div>

        <dl className="bg-page space-y-3 rounded-xl px-4 py-4 text-sm">
          {facts.map((item) => (
            <div key={item.label}>
              <dt className="text-muted text-xs">{item.label}</dt>
              <dd className="text-ink mt-1 whitespace-pre-wrap">
                {item.value}
              </dd>
            </div>
          ))}
          <p className="text-muted text-xs">{t('campaignPublishNotice')}</p>
        </dl>

        <div className="flex flex-wrap gap-2">
          {canLaunch ? (
            <>
              <Button
                disabled={isBusy}
                onClick={() => onStatus('ASSISTED_LAUNCH')}
              >
                {t('campaignAssistedLaunch')}
              </Button>
              <Button
                variant="outline"
                disabled={isBusy}
                onClick={() => onStatus('SIMULATED')}
              >
                {t('campaignSimulate')}
              </Button>
            </>
          ) : null}
          {running ? (
            <Button
              variant="outline"
              disabled={isBusy}
              onClick={() => onStatus('PAUSED')}
            >
              {t('campaignPause')}
            </Button>
          ) : null}
          {campaign.status !== 'ARCHIVED' ? (
            <Button
              variant="ghost"
              disabled={isBusy}
              onClick={() => onStatus('ARCHIVED')}
            >
              {t('campaignArchive')}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
