import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { updateBusiness, type PlanTier } from '@/features/business/api';

export function useBilling() {
  const { business, refreshMe } = useAuth();
  const current = business?.plan ?? 'FREE';

  const switchMut = useMutation({
    mutationFn: (plan: PlanTier) => updateBusiness({ plan }),
    onSuccess: async () => {
      await refreshMe();
    },
  });

  return {
    current,
    switchMut,
  };
}
