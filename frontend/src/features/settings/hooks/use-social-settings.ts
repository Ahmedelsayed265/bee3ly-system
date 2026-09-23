import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  disconnectSocial,
  fetchMetaPending,
  fetchSocial,
  selectMetaPage,
  startMetaConnect,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { ChannelId, SocialAccount } from '@/features/settings/types';

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

  const selectPageMut = useMutation({
    mutationFn: ({ pageId }: { pageId: string }) =>
      selectMetaPage(pendingId!, pageId),
    onSuccess: async (data) => {
      toast.success(
        data.instagram ? t('metaConnectedFbIg') : t('metaConnectedFbOnly'),
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
  const metaBusy = metaConnectMut.isPending;

  const connectMeta = () => metaConnectMut.mutate();
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
    metaBusy,
    isDisconnecting: disconnectMut.isPending,
    isSelectingPage: selectPageMut.isPending,
    connectMeta,
    disconnect,
    selectPage: (pageId: string) => selectPageMut.mutate({ pageId }),
  };
}
