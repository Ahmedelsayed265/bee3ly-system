import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ConnectedResults } from '@/features/campaigns/components/connected-results';
import { CampaignWizard } from '@/features/campaigns/components/campaign-wizard';
import { useCampaigns } from '@/features/campaigns/hooks/use-campaigns';
import { previewCampaigns } from '@/features/campaigns/preview-data';
import { useLocale } from '@/features/i18n/locale-context';
import { useState } from 'react';

export function CampaignsPageView() {
  const { t } = useLocale();
  const campaigns = useCampaigns();
  const [creating, setCreating] = useState(false);

  const openComposer = () => {
    campaigns.resetWizard();
    setCreating(true);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-ink text-2xl font-bold">{t('navCampaigns')}</h1>
          {!creating ? (
            <p className="text-muted mt-1 text-sm">{t('campaignsIntro')}</p>
          ) : null}
        </div>
        {creating ? (
          <Button variant="outline" onClick={() => setCreating(false)}>
            {t('campaignBackToList')}
          </Button>
        ) : (
          <Button onClick={openComposer}>{t('campaignNew')}</Button>
        )}
      </div>

      {creating ? (
        <div className="grid w-full items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CampaignWizard
            step={campaigns.step}
            onStepChange={campaigns.setStep}
            offer={campaigns.offer}
            onOfferChange={campaigns.setOffer}
            objective={campaigns.objective}
            onObjectiveChange={campaigns.setObjective}
            audience={campaigns.audience}
            onAudienceChange={campaigns.setAudience}
            budget={campaigns.budget}
            onBudgetChange={campaigns.setBudget}
            valueProp={campaigns.valueProp}
            onValuePropChange={campaigns.setValueProp}
            created={campaigns.created}
            notice={campaigns.notice}
            isCreating={campaigns.isCreating}
            isLaunching={campaigns.isLaunching}
            onGenerate={campaigns.generate}
            onRequestLaunch={(status) => {
              if (!campaigns.created) return;
              campaigns.setPendingLaunch({
                id: campaigns.created.id,
                status,
              });
            }}
            onReset={campaigns.resetWizard}
          />
          <aside className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-ink text-sm font-semibold">
              {t('campaignLivePreviewTitle')}
            </p>
            <p className="text-muted mt-1 text-xs leading-5">
              {t('campaignLivePreviewBody')}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <PreviewRow
                label={t('metric_spend')}
                value="5,000"
                unit={t('egp')}
              />
              <PreviewRow label={t('metric_impressions')} value="100,000" />
              <PreviewRow label={t('metric_clicks')} value="2,000" />
              <PreviewRow label={t('metric_ctr')} value="2%" />
              <PreviewRow label={t('metricConversations')} value="500" />
              <PreviewRow label={t('metricLeads')} value="100" />
              <PreviewRow label={t('metricOrders')} value="30" />
              <PreviewRow
                label={t('metric_revenue')}
                value="20,000"
                unit={t('egp')}
              />
              <PreviewRow label={t('metric_roas')} value="4x" />
            </dl>
          </aside>
        </div>
      ) : (
        <ConnectedResults campaigns={previewCampaigns} />
      )}

      <ConfirmDialog
        open={Boolean(campaigns.pendingLaunch)}
        title={t('confirmLaunchTitle')}
        description={t('confirmLaunchBody', {
          action:
            campaigns.pendingLaunch?.status === 'SIMULATED'
              ? t('campaignSimulate')
              : t('campaignAssistedLaunch'),
        })}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        pending={campaigns.isLaunching}
        onOpenChange={(open) => {
          if (!open) campaigns.setPendingLaunch(null);
        }}
        onConfirm={() => {
          if (!campaigns.pendingLaunch) return;
          campaigns.launch(campaigns.pendingLaunch);
        }}
      />
    </div>
  );
}

function PreviewRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink font-semibold">
        {value}
        {unit ? <span className="text-muted ms-1 text-xs">{unit}</span> : null}
      </dd>
    </div>
  );
}
