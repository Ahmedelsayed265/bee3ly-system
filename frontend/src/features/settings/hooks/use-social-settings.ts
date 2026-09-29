import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  completeWhatsAppEmbeddedSignup,
  disconnectSocial,
  fetchMetaPending,
  fetchSocial,
  selectMetaPage,
  startMetaConnect,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { launchWhatsAppEmbeddedSignup } from '@/features/settings/lib/whatsapp-embedded';
import type { ChannelId, SocialAccount } from '@/features/settings/types';

function apiErrorMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const data = err.response?.data as
    { message?: string | string[] } | undefined;
  if (!data?.message) return null;
  return Array.isArray(data.message) ? data.message.join(', ') : data.message;
}

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
  }, [searchParams, setSearchParams, t]);

  const disconnectMut = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social'] });
      toast.success(t('connectionDisconnected'));
    },
    onError: () => {
      toast.error(t('connectionError'));
    },
  });

  const metaConnectMut = useMutation({
    mutationFn: startMetaConnect,
    onSuccess: (data) => {
      window.location.href = data.oauthUrl;
    },
    onError: () => {
      toast.error(t('connectionError'));
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
      const apiMsg = apiErrorMessage(err);
      toast.error(apiMsg ?? t('connectionError'));
    },
  });

  const selectPageMut = useMutation({
    mutationFn: ({ pageId }: { pageId: string }) =>
      selectMetaPage(pendingId!, pageId),
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
  const metaReady = Boolean(socialQuery.data?.metaConfigured);
  const whatsappEmbeddedReady = Boolean(
    socialQuery.data?.whatsappEmbedded?.configured ||
    viteWhatsAppEmbeddedConfig()?.configured,
  );
  const metaBusy = metaConnectMut.isPending;

  const connectMeta = () => metaConnectMut.mutate();
  const connectWhatsApp = () => whatsappConnectMut.mutate();
  const disconnect = (platform: ChannelId) => {
    disconnectMut.mutate(platform);
  };

  return {
    pendingId,
    pendingPages: pendingQuery.data?.pages ?? [],
    pendingLoading: pendingQuery.isLoading,
    pendingError: pendingQuery.isError,
    facebook,
    instagram,
    whatsapp,
    metaReady,
    whatsappEmbeddedReady,
    metaBusy,
    whatsappBusy: whatsappConnectMut.isPending,
    isDisconnecting: disconnectMut.isPending,
    isSelectingPage: selectPageMut.isPending,
    connectMeta,
    connectWhatsApp,
    disconnect,
    selectPage: (pageId: string) => selectPageMut.mutate({ pageId }),
  };
}
