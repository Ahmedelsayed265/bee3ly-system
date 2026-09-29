import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/brand/channel-icons';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import { ChannelCard } from '@/features/settings/components/channel-card';
import { MetaPagePicker } from '@/features/settings/components/meta-page-picker';
import type { ChannelId, SocialAccount } from '@/features/settings/types';

type SocialChannelsSectionProps = {
  pendingId: string | null;
  pendingPages: Array<{ id: string; name: string; hasInstagram: boolean }>;
  pendingLoading: boolean;
  pendingError: boolean;
  facebook?: SocialAccount;
  instagram?: SocialAccount;
  whatsapp?: SocialAccount;
  metaReady: boolean;
  whatsappEmbeddedReady: boolean;
  metaBusy: boolean;
  isDisconnecting: boolean;
  isSelectingPage: boolean;
  onConnectMeta: () => void;
  onConnectWhatsApp: () => void;
  whatsappBusy: boolean;
  onDisconnect: (platform: ChannelId) => void;
  onSelectPage: (pageId: string) => void;
};

export function SocialChannelsSection({
  pendingId,
  pendingPages,
  pendingLoading,
  pendingError,
  facebook,
  instagram,
  whatsapp,
  metaReady,
  whatsappEmbeddedReady,
  metaBusy,
  isDisconnecting,
  isSelectingPage,
  onConnectMeta,
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
              <p className="text-brand text-xs font-semibold">
                {t('selectFacebookPage')}
              </p>
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
          comingSoon
        />
      </div>
    </section>
  );
}
