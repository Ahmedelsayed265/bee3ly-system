import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { fetchCampaign } from '@/features/business/api';
import { CampaignDetail } from '@/features/campaigns/components/campaign-detail';
import { CampaignList } from '@/features/campaigns/components/campaign-list';
import { CampaignWizard } from '@/features/campaigns/components/campaign-wizard';
import { useCampaigns } from '@/features/campaigns/hooks/use-campaigns';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export function CampaignsPageView() {
  const { t } = useLocale();
  const campaigns = useCampaigns();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const detailQuery = useQuery({
    queryKey: ['campaign', openId],
    queryFn: () => fetchCampaign(openId!),
    enabled: Boolean(openId) && !creating,
  });

  const openComposer = () => {
    campaigns.resetWizard();
    setOpenId(null);
    setCreating(true);
  };

  const backToList = () => {
    const createdId = campaigns.created?.id;
    setCreating(false);
    if (createdId) setOpenId(createdId);
  };

  const pending = campaigns.pendingLaunch;
  const confirmCopy = pending
    ? confirmFor(pending.status, pending.name, t)
    : null;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-ink text-2xl font-bold">{t('navCampaigns')}</h1>
          {!creating && !openId ? (
            <p className="text-muted mt-1 text-sm">{t('campaignsIntro')}</p>
          ) : null}
        </div>
        {creating || openId ? (
          <Button
            variant="outline"
            onClick={() => {
              if (creating) backToList();
              else setOpenId(null);
            }}
          >
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
            productId={campaigns.productId}
            onProductChange={campaigns.setProductId}
            adCopy={campaigns.adCopy}
            onAdCopyChange={campaigns.setAdCopy}
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
                name: campaigns.created.name,
                status,
              });
            }}
            onReset={campaigns.resetWizard}
          />
          <aside className="border-border bg-surface rounded-2xl border p-5">
            <p className="text-ink text-sm font-semibold">
              {t('campaignObjectiveMetrics')}
            </p>
            <p className="text-muted mt-2 text-sm leading-6">
              {t(`campaignMetrics_${campaigns.objective}` as MessageKey)}
            </p>
            <p className="text-ink mt-4 text-sm font-semibold">
              {t('plannedBudget')}{' '}
              <span className="tabular-nums">
                {Number(campaigns.budget || 0).toLocaleString()} {t('egp')}
              </span>
            </p>
            <p className="text-muted mt-2 text-xs leading-5">
              {t('campaignBudgetNotice')}
            </p>
            <p className="text-muted mt-2 text-xs leading-5">
              {t('analyticsIntro')}
            </p>
          </aside>
        </div>
      ) : openId ? (
        detailQuery.data ? (
          <CampaignDetail
            campaign={detailQuery.data}
            isBusy={campaigns.isLaunching}
            onStatus={(status) =>
              campaigns.setPendingLaunch({
                id: detailQuery.data.id,
                name: detailQuery.data.name,
                status,
              })
            }
          />
        ) : (
          <p className="text-muted text-sm">{t('campaignsIntro')}</p>
        )
      ) : campaigns.isLoading ? null : campaigns.total === 0 ? (
        <p className="text-muted text-sm">{t('campaignEmpty')}</p>
      ) : (
        <CampaignList
          campaigns={campaigns.campaigns}
          total={campaigns.total}
          page={campaigns.page}
          totalPages={campaigns.totalPages}
          isFetching={campaigns.isFetching}
          onOpen={setOpenId}
          onPage={campaigns.setPage}
        />
      )}

      <ConfirmDialog
        open={Boolean(pending && confirmCopy)}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.body ?? ''}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        pending={campaigns.isLaunching}
        onOpenChange={(open) => {
          if (!open) campaigns.setPendingLaunch(null);
        }}
        onConfirm={() => {
          if (!pending) return;
          const id = pending.id;
          campaigns.launch(pending, {
            onSuccess: () => {
              setCreating(false);
              setOpenId(id);
            },
          });
        }}
      />
    </div>
  );
}

function confirmFor(
  status: 'ASSISTED_LAUNCH' | 'SIMULATED' | 'PAUSED' | 'ARCHIVED',
  name: string,
  t: (key: MessageKey, params?: Record<string, string>) => string,
) {
  if (status === 'PAUSED') {
    return {
      title: t('confirmPauseTitle'),
      body: t('confirmPauseBody', { name }),
    };
  }
  if (status === 'ARCHIVED') {
    return {
      title: t('confirmArchiveTitle'),
      body: t('confirmArchiveBody', { name }),
    };
  }
  return {
    title: t('confirmLaunchTitle'),
    body: t('confirmLaunchBody', {
      action:
        status === 'SIMULATED'
          ? t('campaignSimulate')
          : t('campaignAssistedLaunch'),
    }),
  };
}
