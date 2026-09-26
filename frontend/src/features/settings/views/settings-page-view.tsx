import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/page-layout';
import { useAuth } from '@/features/auth/auth-context';
import { updateBusiness } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { KnowledgeForm } from '@/features/settings/components/knowledge-form';
import { SettingsTabs } from '@/features/settings/components/settings-tabs';
import { ShippingZonesForm } from '@/features/settings/components/shipping-zones-form';
import { SocialChannelsSection } from '@/features/settings/components/social-channels-section';
import {
  parseShippingZones,
  type ShippingZone,
} from '@/features/settings/governorates';
import { useKnowledgeSettings } from '@/features/settings/hooks/use-knowledge-settings';
import { useSocialSettings } from '@/features/settings/hooks/use-social-settings';
import type { SettingsTab } from '@/features/settings/types';
import { paths } from '@/routes/paths';

export function SettingsPageView() {
  const { t } = useLocale();
  const { business, refreshMe } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('social');
  const [zones, setZones] = useState<ShippingZone[]>(() =>
    parseShippingZones(business?.shippingZones),
  );
  const social = useSocialSettings();
  const knowledge = useKnowledgeSettings();
  const saveShipping = useMutation({
    mutationFn: () =>
      updateBusiness({
        shippingZones: zones.map((zone) => ({
          ...zone,
          name: zone.name.trim(),
          priceEgp: Math.max(0, Math.floor(zone.priceEgp)),
        })),
      }),
    onSuccess: async () => {
      await refreshMe();
      toast.success(t('profileSaved'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

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
      ) : tab === 'shipping' ? (
        <ShippingZonesForm
          zones={zones}
          isSaving={saveShipping.isPending}
          onChange={setZones}
          onSave={() => saveShipping.mutate()}
        />
      ) : (
        <KnowledgeForm
          faqs={knowledge.faqs}
          deliveryInfo={knowledge.deliveryInfo}
          workingHours={knowledge.workingHours}
          paymentInfo={knowledge.paymentInfo}
          isSaving={knowledge.isSaving}
          onFaqsChange={knowledge.setFaqs}
          onDeliveryInfoChange={knowledge.setDeliveryInfo}
          onWorkingHoursChange={knowledge.setWorkingHours}
          onPaymentInfoChange={knowledge.setPaymentInfo}
          onSave={knowledge.save}
        />
      )}
    </PageLayout>
  );
}
