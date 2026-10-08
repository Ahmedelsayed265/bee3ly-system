import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/brand/channel-icons';
import { Button } from '@/components/ui/button';
import { HelpLink } from '@/features/help/help-link';
import { useLocale } from '@/features/i18n/locale-context';
import { ChannelCard } from '@/features/settings/components/channel-card';
import {
  ConnectionChecklist,
  type ChecklistState,
} from '@/features/settings/components/connection-checklist';
import { MetaPagePicker } from '@/features/settings/components/meta-page-picker';
import type { ChannelId, SocialAccount } from '@/features/settings/types';

type SocialChannelsSectionProps = {
  pendingId: string | null;
  pendingPages: Array<{ id: string; name: string; hasInstagram: boolean }>;
  pendingAdAccounts?: Array<{
    id: string;
    name: string;
    currency: string | null;
  }>;
  adAccountId?: string;
  onAdAccountChange?: (id: string) => void;
  metaAdsNeedsReconnect?: boolean;
  connection?: {
    facebook: { state: ChecklistState };
    instagram: { state: ChecklistState };
    whatsapp: { state: ChecklistState };
    adAccount: { state: ChecklistState };
    adsPermissions: { state: ChecklistState };
  } | null;
  pendingLoading: boolean;
  pendingError: boolean;
  facebook?: SocialAccount;
  instagram?: SocialAccount;
  whatsapp?: SocialAccount;
  tiktok?: SocialAccount;
  metaReady: boolean;
  tiktokReady: boolean;
  whatsappEmbeddedReady: boolean;
  metaBusy: boolean;
  tiktokBusy: boolean;
  isDisconnecting: boolean;
  isSelectingPage: boolean;
  onConnectMeta: () => void;
  onConnectTikTok: () => void;
  onConnectWhatsApp: () => void;
  whatsappBusy: boolean;
  onDisconnect: (platform: ChannelId) => void;
  onSelectPage: (pageId: string) => void;
};

export function SocialChannelsSection({
  pendingId,
  pendingPages,
  pendingAdAccounts = [],
  adAccountId,
  onAdAccountChange,
  metaAdsNeedsReconnect,
  connection,
  pendingLoading,
  pendingError,
  facebook,
  instagram,
  whatsapp,
  tiktok,
  metaReady,
  tiktokReady,
  whatsappEmbeddedReady,
  metaBusy,
  tiktokBusy,
  isDisconnecting,
  isSelectingPage,
  onConnectMeta,
  onConnectTikTok,
  onConnectWhatsApp,
  whatsappBusy,
  onDisconnect,
  onSelectPage,
}: SocialChannelsSectionProps) {
  const whatsappLinked =
    whatsapp &&
    whatsapp.status !== 'DISCONNECTED' &&
    whatsapp.status !== undefined;
  const { t } = useLocale();

  return (
    <section className="w-full space-y-4">
      <div>
        <h2 className="text-ink text-base font-bold">{t('channelsTitle')}</h2>
        <p className="text-muted mt-1 text-sm">{t('socialAccountsHint')}</p>
        {!metaReady ? (
          <p className="text-muted mt-2 text-xs">{t('metaNotConfigured')}</p>
        ) : null}
        {connection ? (
          <ConnectionChecklist
            rows={[
              {
                key: 'facebook',
                labelKey: 'checklistFacebook',
                state: connection.facebook.state,
                article: 'connect-facebook',
                onAction: onConnectMeta,
                actionLabel:
                  connection.facebook.state === 'reconnect'
                    ? t('channelReconnect')
                    : t('channelConnect'),
                actionDisabled: metaBusy || !metaReady,
              },
              {
                key: 'instagram',
                labelKey: 'checklistInstagram',
                state: connection.instagram.state,
                article: 'instagram-professional',
                onAction: onConnectMeta,
                actionLabel: t('channelConnect'),
                actionDisabled: metaBusy || !metaReady,
              },
              {
                key: 'whatsapp',
                labelKey: 'checklistWhatsapp',
                state: connection.whatsapp.state,
                article: 'connect-whatsapp',
                onAction: onConnectWhatsApp,
                actionLabel: t('channelConnectWhatsAppNumber'),
                actionDisabled: whatsappBusy || !whatsappEmbeddedReady,
              },
              {
                key: 'adAccount',
                labelKey: 'checklistAdAccount',
                state: connection.adAccount.state,
                article: 'create-ad-account',
                onAction: onConnectMeta,
                actionLabel:
                  connection.adAccount.state === 'missing'
                    ? t('selectAdAccount')
                    : t('channelReconnect'),
                actionDisabled: metaBusy || !metaReady,
              },
              {
                key: 'adsPermissions',
                labelKey: 'checklistAdsPermissions',
                state: connection.adsPermissions.state,
                article: 'ads-permissions',
                onAction: onConnectMeta,
                actionLabel: t('channelReconnect'),
                actionDisabled: metaBusy || !metaReady,
              },
            ]}
          />
        ) : null}
        {metaAdsNeedsReconnect ? (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            {t('reconnectMetaAds')}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChannelCard
          icon={<FacebookIcon className="h-5 w-5" />}
          iconClassName="bg-[#1877F2]/10 text-[#1877F2]"
          title={t('channelFacebook')}
          description={
            pendingId ? t('selectFacebookPageHint') : t('channelFacebookHint')
          }
          account={pendingId ? undefined : facebook}
          action={
            pendingId ? (
              <div className="space-y-1">
                <p className="text-brand text-xs font-semibold">
                  {t('selectFacebookPage')}
                </p>
                <HelpLink slug="connect-facebook" />
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={metaBusy || !metaReady}
                  onClick={onConnectMeta}
                >
                  {facebook?.status === 'CONNECTED'
                    ? t('channelReconnect')
                    : t('channelConnect')}
                </Button>
                <HelpLink slug="connect-facebook" />
                {facebook && facebook.status !== 'DISCONNECTED' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    disabled={isDisconnecting}
                    onClick={() => onDisconnect('FACEBOOK')}
                  >
                    {t('disconnectAccount')}
                  </Button>
                ) : null}
              </>
            )
          }
          footer={
            pendingId ? (
              <MetaPagePicker
                pages={pendingPages}
                adAccounts={pendingAdAccounts}
                adAccountId={adAccountId}
                onAdAccountChange={onAdAccountChange}
                isLoading={pendingLoading}
                isError={pendingError}
                isPending={isSelectingPage}
                onSelect={onSelectPage}
              />
            ) : null
          }
        />

        <ChannelCard
          icon={<InstagramIcon className="h-5 w-5" />}
          iconClassName="bg-[#E1306C]/10 text-[#E1306C]"
          title={t('channelInstagram')}
          description={t('channelInstagramHint')}
          account={instagram}
          action={
            <>
              <Button
                size="sm"
                variant={
                  instagram?.status === 'CONNECTED' ? 'outline' : 'default'
                }
                disabled={metaBusy || !metaReady || Boolean(pendingId)}
                onClick={onConnectMeta}
              >
                {instagram?.status === 'CONNECTED'
                  ? t('channelReconnect')
                  : t('channelConnect')}
              </Button>
              <HelpLink slug="instagram-professional" />
              {instagram && instagram.status !== 'DISCONNECTED' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                  disabled={isDisconnecting}
                  onClick={() => onDisconnect('INSTAGRAM')}
                >
                  {t('disconnectAccount')}
                </Button>
              ) : null}
            </>
          }
        />

        <ChannelCard
          icon={<WhatsAppIcon className="h-5 w-5" />}
          iconClassName="bg-[#25D366]/10 text-[#25D366]"
          title={t('channelWhatsApp')}
          description={
            whatsappEmbeddedReady
              ? t('channelWhatsAppHint')
              : t('channelWhatsAppEmbeddedSetupHint')
          }
          account={whatsapp}
          action={
            <>
              <Button
                size="sm"
                variant={
                  whatsapp?.status === 'CONNECTED' ? 'outline' : 'default'
                }
                disabled={whatsappBusy || !whatsappEmbeddedReady}
                onClick={onConnectWhatsApp}
              >
                {whatsapp?.status === 'CONNECTED'
                  ? t('channelReconnect')
                  : t('channelConnectWhatsAppNumber')}
              </Button>
              <HelpLink slug="connect-whatsapp" />
              {whatsappLinked ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                  disabled={isDisconnecting}
                  onClick={() => onDisconnect('WHATSAPP')}
                >
                  {t('disconnectAccount')}
                </Button>
              ) : null}
            </>
          }
        />

        <ChannelCard
          icon={<TikTokIcon className="h-5 w-5" />}
          iconClassName="bg-ink/5 text-ink"
          title={t('channelTikTok')}
          description={t('channelTikTokHint')}
          account={tiktok}
          action={
            <>
              <Button
                size="sm"
                disabled={tiktokBusy || !tiktokReady}
                onClick={onConnectTikTok}
              >
                {tiktok?.status === 'CONNECTED'
                  ? t('channelReconnect')
                  : t('channelConnect')}
              </Button>
              {tiktok && tiktok.status !== 'DISCONNECTED' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                  disabled={isDisconnecting}
                  onClick={() => onDisconnect('TIKTOK')}
                >
                  {t('disconnectAccount')}
                </Button>
              ) : null}
            </>
          }
          footer={
            !tiktokReady ? (
              <p className="text-muted text-xs">{t('tiktokNotConfigured')}</p>
            ) : null
          }
        />
      </div>
    </section>
  );
}
