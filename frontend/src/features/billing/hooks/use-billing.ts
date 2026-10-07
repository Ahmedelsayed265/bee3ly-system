import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelSubscription,
  confirmDevPayment,
  fetchBillingCatalog,
  fetchBillingOverview,
  startCheckout,
  type BillingInterval,
  type PublicPlan,
} from '@/features/billing/api';

export function useBilling() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: fetchBillingOverview,
  });
  const catalog = useQuery({
    queryKey: ['billing', 'catalog'],
    queryFn: fetchBillingCatalog,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['billing'] });
  };

  const checkout = useMutation({
    mutationFn: (input: { plan: PublicPlan; interval: BillingInterval }) =>
      startCheckout(input),
    onSuccess: async (result) => {
      if (result.mode !== 'checkout') await refresh();
    },
  });

  const confirm = useMutation({
    mutationFn: confirmDevPayment,
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: refresh,
  });

  return { overview, catalog, checkout, confirm, cancel };
}
