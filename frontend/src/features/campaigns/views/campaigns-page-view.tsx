import { PageLayout } from '@/components/layout/page-layout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CampaignList } from '@/features/campaigns/components/campaign-list';
import { CampaignWizard } from '@/features/campaigns/components/campaign-wizard';
import { useCampaigns } from '@/features/campaigns/hooks/use-campaigns';
import { useLocale } from '@/features/i18n/locale-context';

export function CampaignsPageView() {
  const { t } = useLocale();
  const campaigns = useCampaigns();

  return (
    <PageLayout title={t('navCampaigns')} description={t('campaignsIntro')}>
      <div className="grid w-full gap-4 xl:grid-cols-[1.2fr_1fr]">
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

        <CampaignList
          campaigns={campaigns.campaigns}
          total={campaigns.total}
          page={campaigns.page}
          totalPages={campaigns.totalPages}
          isFetching={campaigns.isFetching}
          onPage={campaigns.setPage}
        />
      </div>

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
    </PageLayout>
  );
}
