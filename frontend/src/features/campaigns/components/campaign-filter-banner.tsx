import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';

export function CampaignFilterBanner() {
  const { t } = useLocale();
  const [params, setParams] = useSearchParams();
  const campaignId = params.get('campaignId');
  const name = params.get('campaign');
  if (!campaignId) return null;

  return (
    <div className="bg-brand/8 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5">
      <p className="text-ink text-sm font-semibold">
        {t('campaignFilteredBy', { name: name || t('navCampaigns') })}
      </p>
      <Button
        type="button"
        variant="ghost"
        className="h-8 px-2.5 text-xs"
        onClick={() => {
          const next = new URLSearchParams(params);
          next.delete('campaignId');
          next.delete('campaign');
          setParams(next);
        }}
      >
        {t('campaignClearFilter')}
      </Button>
    </div>
  );
}
