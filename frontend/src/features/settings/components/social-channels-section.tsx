import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from '@/components/brand/channel-icons';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import { ChannelCard } from '@/features/settings/components/channel-card';
import { MetaPagePicker } from '@/features/settings/components/meta-page-picker';
import type { SocialAccount } from '@/features/settings/types';

type SocialChannelsSectionProps = {
  pendingId: string | null;
  pendingPages: Array<{ id: string; name: string; hasInstagram: boolean }>;
  pendingLoading: boolean;
  pendingError: boolean;
  facebook?: SocialAccount;
  instagram?: SocialAccount;
  metaReady: boolean;
  metaBusy: boolean;
  isDisconnecting: boolean;
  isSelectingPage: boolean;
  onConnectMeta: () => void;
  onDisconnect: (platform: 'FACEBOOK' | 'INSTAGRAM') => void;
  onSelectPage: (pageId: string) => void;
};

export function SocialChannelsSection({
  pendingId,
  pendingPages,
  pendingLoading,
  pendingError,
  facebook,
  instagram,
  metaReady,
  metaBusy,
  isDisconnecting,
  isSelectingPage,
  onConnectMeta,
  onDisconnect,
  onSelectPage,
}: SocialChannelsSectionProps) {
  const { t } = useLocale();

  return (
    <section className="w-full space-y-4">
      <div>
        <h2 className="text-ink text-base font-bold">{t('channelsTitle')}</h2>
        <p className="text-muted mt-1 text-sm">{t('socialAccountsHint')}</p>
        {!metaReady ? (
          <p className="text-muted mt-2 text-xs">{t('metaNotConfigured')}</p>
        ) : (
          <p className="text-muted mt-2 text-xs">{t('metaConnectHint')}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          description={t('channelWhatsAppHint')}
          action={
            <Button size="sm" variant="outline" disabled>
              {t('channelComingSoon')}
            </Button>
          }
        />
      </div>
    </section>
  );
}
