import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

export function useAnalytics() {
  const { t } = useLocale();
  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });

  const metrics = overviewQuery.data?.metrics;

  return {
    overviewQuery,
    metrics,
    report: overviewQuery.data?.report ?? null,
    unattributed: overviewQuery.data?.unattributed ?? null,
    enough: overviewQuery.data?.enoughData,
    campaigns: overviewQuery.data?.campaigns ?? [],
    t,
  };
}
