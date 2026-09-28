import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/page-layout';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/i18n/locale-context';
import { KnowledgeForm } from '@/features/settings/components/knowledge-form';
import { ShippingZonesForm } from '@/features/settings/components/shipping-zones-form';
import { SettingsTabs } from '@/features/settings/components/settings-tabs';
import { SocialChannelsSection } from '@/features/settings/components/social-channels-section';
import { useDeliverySettings } from '@/features/settings/hooks/use-delivery-settings';
import { useKnowledgeSettings } from '@/features/settings/hooks/use-knowledge-settings';
import { Button } from '@/components/ui/button';
import { useSocialSettings } from '@/features/settings/hooks/use-social-settings';
import type { SettingsTab } from '@/features/settings/types';
import { businessUsesPhysicalHours } from '@/features/business/uses-physical-hours';
import { paths } from '@/routes/paths';

function BusinessKnowledgeTab({
  onOpenDelivery,
}: {
  onOpenDelivery: () => void;
}) {
  const { business } = useAuth();
  const knowledge = useKnowledgeSettings();
  const showWorkingHours = businessUsesPhysicalHours(business?.type);
  return (
    <KnowledgeForm
      faqs={knowledge.faqs}
      workingHours={knowledge.workingHours}
      paymentInfo={knowledge.paymentInfo}
      showWorkingHours={showWorkingHours}
      isSaving={knowledge.isSaving}
      onFaqsChange={knowledge.setFaqs}
      onWorkingHoursChange={knowledge.setWorkingHours}
      onPaymentInfoChange={knowledge.setPaymentInfo}
      onSave={knowledge.save}
      onOpenDelivery={onOpenDelivery}
    />
  );
}

export function SettingsPageView() {
  const { t } = useLocale();
  const { business } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('social');
  const knowledgeFormKey = business
    ? `${business.id}|${business.faqs ?? ''}|${business.workingHours ?? ''}|${business.paymentInfo ?? ''}`
    : 'loading';
  const social = useSocialSettings();
  const delivery = useDeliverySettings();
  return (
    <PageLayout
      title={t('navSettings')}
      description={t('settingsIntro')}
      actions={
        <>
          <Link
            to={paths.profile}
            className="border-border bg-surface hover:bg-lavender rounded-xl border px-3 py-2 text-sm font-semibold"
          >
            {t('navProfile')}
          </Link>
          <Link
            to={paths.billing}
            className="border-border bg-surface text-brand hover:bg-lavender rounded-xl border px-3 py-2 text-sm font-semibold"
          >
            {t('navBilling')}
          </Link>
        </>
      }
    >
      <SettingsTabs tab={tab} onTabChange={setTab} />

      {tab === 'social' ? (
        <SocialChannelsSection
          pendingId={social.pendingId}
          pendingPages={social.pendingPages}
          pendingLoading={social.pendingLoading}
          pendingError={social.pendingError}
          facebook={social.facebook}
          instagram={social.instagram}
          whatsapp={social.whatsapp}
          metaReady={social.metaReady}
          metaBusy={social.metaBusy}
          isDisconnecting={social.isDisconnecting}
          isSelectingPage={social.isSelectingPage}
          onConnectMeta={social.connectMeta}
          onDisconnect={social.disconnect}
          onSelectPage={social.selectPage}
        />
      ) : tab === 'delivery' ? (
        <div className="space-y-4">
          <ShippingZonesForm
            zones={delivery.zones}
            onChange={delivery.setZones}
          />
          <div className="flex justify-end">
            <Button
              disabled={delivery.isSaving}
              onClick={() => delivery.save()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      ) : business ? (
        <BusinessKnowledgeTab
          key={knowledgeFormKey}
          onOpenDelivery={() => setTab('delivery')}
        />
      ) : null}
    </PageLayout>
  );
}
