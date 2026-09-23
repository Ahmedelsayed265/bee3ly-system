import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/page-layout';
import { useLocale } from '@/features/i18n/locale-context';
import { KnowledgeForm } from '@/features/settings/components/knowledge-form';
import { SettingsTabs } from '@/features/settings/components/settings-tabs';
import { SocialChannelsSection } from '@/features/settings/components/social-channels-section';
import { useKnowledgeSettings } from '@/features/settings/hooks/use-knowledge-settings';
import { useSocialSettings } from '@/features/settings/hooks/use-social-settings';
import type { SettingsTab } from '@/features/settings/types';
import { paths } from '@/routes/paths';

export function SettingsPageView() {
  const { t } = useLocale();
  const [tab, setTab] = useState<SettingsTab>('social');
  const social = useSocialSettings();
  const knowledge = useKnowledgeSettings();

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
