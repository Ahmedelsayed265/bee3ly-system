import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  completeWhatsAppEmbeddedSignup,
  disconnectSocial,
  fetchMetaPending,
  fetchSocial,
  selectMetaPage,
  startMetaConnect,
  startTikTokConnect,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { launchWhatsAppEmbeddedSignup } from '@/features/settings/lib/whatsapp-embedded';
import type { ChannelId, SocialAccount } from '@/features/settings/types';
import { getApiErrorMessage } from '@/lib/api';

function viteWhatsAppEmbeddedConfig() {
  const appId = import.meta.env.VITE_META_APP_ID?.trim();
  const configId =
    import.meta.env.VITE_META_WHATSAPP_EMBEDDED_CONFIG_ID?.trim();
  if (!appId || !configId) return null;
  return { configured: true as const, appId, configId };
}

export function useSocialSettings() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const socialQuery = useQuery({ queryKey: ['social'], queryFn: fetchSocial });

  const [adAccountId, setAdAccountId] = useState('');
  const pendingId = searchParams.get('metaPending');
  const pendingQuery = useQuery({
    queryKey: ['meta-pending', pendingId],
    queryFn: () => fetchMetaPending(pendingId!),
    enabled: Boolean(pendingId),
  });

  useEffect(() => {
    if (searchParams.get('meta') === 'connected') {
      toast.success(t('metaConnectedOk'));
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('tiktok') === 'connected') {
      toast.success(t('tiktokConnectedOk'));
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('tiktok') === 'error') {
      toast.error(t('tiktokConnectFailed'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    const first = pendingQuery.data?.adAccounts?.[0]?.id;
    if (first) setAdAccountId((current) => current || first);
  }, [pendingQuery.data?.adAccounts]);

  const disconnectMut = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
      toast.success(t('connectionDisconnected'));
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err) ?? t('connectionError'));
    },
  });

  const metaConnectMut = useMutation({
    mutationFn: startMetaConnect,
    onSuccess: (data) => {
      window.location.href = data.oauthUrl;
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err) ?? t('connectionError'));
    },
  });

  const tiktokConnectMut = useMutation({
    mutationFn: startTikTokConnect,
    onSuccess: (data) => {
      const url = new URL(data.oauthUrl);
      url.searchParams.set('lang', 'en');
      window.location.href = url.toString();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err) ?? t('tiktokConnectFailed'));
    },
  });

  const whatsappConnectMut = useMutation({
    retry: false,
    onMutate: () => {
      toast.loading(t('whatsappSignupWaiting'), { id: 'wa-signup' });
    },
    mutationFn: async () => {
      const cfg =
        socialQuery.data?.whatsappEmbedded?.configured &&
        socialQuery.data.whatsappEmbedded.appId &&
        socialQuery.data.whatsappEmbedded.configId
          ? socialQuery.data.whatsappEmbedded
          : viteWhatsAppEmbeddedConfig();
      if (!cfg?.configured || !cfg.appId || !cfg.configId) {
        throw new Error('whatsapp_embedded_not_configured');
      }
      const { code, session } = await launchWhatsAppEmbeddedSignup({
        appId: cfg.appId,
        configId: cfg.configId,
      });
      return completeWhatsAppEmbeddedSignup({
        code,
        phoneNumberId: session.phoneNumberId,
        wabaId: session.wabaId,
        displayPhoneNumber: session.displayPhoneNumber,
        frontendOrigin: window.location.origin,
      });
    },
    onSettled: () => {
      toast.dismiss('wa-signup');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
      toast.success(t('whatsappConnectedOk'));
    },
    onError: (err: unknown) => {
      if (
        err instanceof Error &&
        err.message === 'whatsapp_embedded_cancelled'
      ) {
        toast.message(t('whatsappSignupCancelled'));
        return;
      }
      if (
        err instanceof Error &&
        err.message === 'whatsapp_embedded_popup_closed'
      ) {
        toast.error(t('whatsappSignupPopupClosed'));
        return;
      }
      if (
        err instanceof Error &&
        err.message === 'whatsapp_embedded_no_callback'
      ) {
        toast.error(t('whatsappSignupNoCallback'));
        return;
      }
      if (
        err instanceof Error &&
        err.message === 'whatsapp_embedded_not_configured'
      ) {
        toast.error(t('whatsappEmbeddedNotConfigured'));
        return;
      }
      const detail = getApiErrorMessage(err);
      toast.error(detail ?? t('whatsappConnectFailed'), {
        duration: detail && detail.length > 80 ? 12_000 : 5_000,
      });
    },
  });

  const selectPageMut = useMutation({
    mutationFn: ({ pageId }: { pageId: string }) =>
      selectMetaPage(pendingId!, pageId, adAccountId || undefined),
    onSuccess: async (data) => {
      toast.success(
        data.whatsapp
          ? t('metaConnectedWithWhatsApp')
          : data.instagram
            ? t('metaConnectedFbIg')
            : t('metaConnectedFbOnly'),
      );
      setSearchParams({});
      await qc.invalidateQueries({ queryKey: ['social'] });
    },
    onError: () => {
      toast.error(t('metaPendingExpired'));
    },
  });

  const accountsByPlatform = useMemo(() => {
    const map = new Map<string, SocialAccount>();
    for (const account of socialQuery.data?.accounts ?? []) {
      if (account.status === 'SIMULATION') continue;
      map.set(account.platform, account);
    }
    return map;
  }, [socialQuery.data?.accounts]);

  const facebook = accountsByPlatform.get('FACEBOOK');
  const instagram = accountsByPlatform.get('INSTAGRAM');
  const whatsapp = accountsByPlatform.get('WHATSAPP');
  const tiktok = accountsByPlatform.get('TIKTOK');
  const metaReady = Boolean(socialQuery.data?.metaConfigured);
  const tiktokReady = Boolean(socialQuery.data?.tiktokConfigured);
  const whatsappEmbeddedReady = Boolean(
    socialQuery.data?.whatsappEmbedded?.configured ||
    viteWhatsAppEmbeddedConfig()?.configured,
  );
  const metaBusy = metaConnectMut.isPending;

  const connectMeta = () => metaConnectMut.mutate();
  const connectTikTok = () => tiktokConnectMut.mutate();
  const connectWhatsApp = () => whatsappConnectMut.mutate();
  const disconnect = (platform: ChannelId) => {
    disconnectMut.mutate(platform);
  };

  return {
    pendingId,
    pendingPages: pendingQuery.data?.pages ?? [],
    pendingAdAccounts: pendingQuery.data?.adAccounts ?? [],
    adAccountId,
    setAdAccountId,
    metaAds: socialQuery.data?.metaAds ?? null,
    pendingLoading: pendingQuery.isLoading,
    pendingError: pendingQuery.isError,
    facebook,
    instagram,
    whatsapp,
    tiktok,
    metaReady,
    tiktokReady,
    whatsappEmbeddedReady,
    metaBusy,
    tiktokBusy: tiktokConnectMut.isPending,
    whatsappBusy: whatsappConnectMut.isPending,
    isDisconnecting: disconnectMut.isPending,
    isSelectingPage: selectPageMut.isPending,
    connectMeta,
    connectTikTok,
    connectWhatsApp,
    disconnect,
    selectPage: (pageId: string) => selectPageMut.mutate({ pageId }),
  };
}
