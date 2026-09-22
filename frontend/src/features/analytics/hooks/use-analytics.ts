import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

export function useAnalytics() {
  const { t } = useLocale();
  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });

  const m = overviewQuery.data?.metrics;
  const enough = overviewQuery.data?.enoughData;

  const cards = [
    { label: t('metricConversations'), value: m?.conversations ?? 0 },
    { label: t('metricLeads'), value: m?.leads ?? 0 },
    { label: t('metricOrders'), value: m?.orders ?? 0 },
    {
      label: t('metricConversions'),
      value: m?.conversions ?? 0,
    },
    { label: t('metricAiHandled'), value: m?.aiHandled ?? 0 },
    { label: t('metricHandoffs'), value: m?.humanHandoffs ?? 0 },
  ];

  return {
    overviewQuery,
    metrics: m,
    enough,
    cards,
    campaigns: overviewQuery.data?.campaigns ?? [],
    t,
  };
}
