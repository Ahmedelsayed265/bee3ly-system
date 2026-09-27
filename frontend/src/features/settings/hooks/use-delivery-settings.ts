import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { updateBusiness } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import {
  parseShippingZones,
  type ShippingZone,
} from '@/features/settings/governorates';

export function useDeliverySettings() {
  const { t } = useLocale();
  const { business, refreshMe } = useAuth();
  const [zones, setZones] = useState<ShippingZone[]>(() =>
    parseShippingZones(business?.shippingZones),
  );

  const saveMut = useMutation({
    mutationFn: () =>
      updateBusiness({
        shippingZones: zones.filter(
          (zone) => zone.name.trim() && zone.governorates.length > 0,
        ),
      }),
    onSuccess: async () => {
      await refreshMe();
      toast.success(t('profileSaved'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

  return {
    zones,
    setZones,
    isSaving: saveMut.isPending,
    save: () => saveMut.mutate(),
  };
}
