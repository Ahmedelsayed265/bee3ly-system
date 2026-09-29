import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { updateBusiness } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { businessAllowsLocalShipping } from '@/features/business/uses-local-shipping';
import type { BusinessType } from '@/features/business/api';
import {
  parseShippingZones,
  type ShippingPricingMode,
  type ShippingZone,
} from '@/features/settings/governorates';

export function useDeliverySettings() {
  const { t } = useLocale();
  const { business, refreshMe } = useAuth();
  const allowsLocal = businessAllowsLocalShipping(
    business?.type as BusinessType | undefined,
  );
  const initialMode: ShippingPricingMode =
    allowsLocal && business?.shippingPricingMode === 'LOCAL_AREA'
      ? 'LOCAL_AREA'
      : 'GOVERNORATE';

  const [mode, setMode] = useState<ShippingPricingMode>(initialMode);
  const [zones, setZones] = useState<ShippingZone[]>(() =>
    parseShippingZones(business?.shippingZones, initialMode),
  );

  const saveMut = useMutation({
    mutationFn: () => {
      const effectiveMode: ShippingPricingMode =
        allowsLocal && mode === 'LOCAL_AREA' ? 'LOCAL_AREA' : 'GOVERNORATE';
      return updateBusiness({
        shippingPricingMode: effectiveMode,
        shippingZones: zones.filter((zone) => {
          if (!zone.name.trim()) return false;
          if (effectiveMode === 'LOCAL_AREA') return true;
          return zone.governorates.length > 0;
        }),
      });
    },
    onSuccess: async () => {
      await refreshMe();
      toast.success(t('profileSaved'));
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const changeMode = (next: ShippingPricingMode) => {
    const effective =
      allowsLocal && next === 'LOCAL_AREA' ? 'LOCAL_AREA' : 'GOVERNORATE';
    setMode(effective);
    setZones((prev) => parseShippingZones(prev, effective));
  };

  return {
    allowsLocal,
    mode,
    setMode: changeMode,
    zones,
    setZones,
    isSaving: saveMut.isPending,
    save: () => saveMut.mutate(),
  };
}
