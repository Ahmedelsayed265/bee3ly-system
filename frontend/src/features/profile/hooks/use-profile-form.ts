import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import {
  updateBusiness,
  updateProfile,
  type BusinessType,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export const BUSINESS_TYPES: BusinessType[] = [
  'RESTAURANT',
  'CAFE',
  'FASHION',
  'PERFUME',
  'BEAUTY',
  'ECOMMERCE',
  'REAL_ESTATE',
  'OTHER',
];

export function useProfileForm() {
  const { t } = useLocale();
  const { user, business, refreshMe } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [businessName, setBusinessName] = useState(business?.name ?? '');
  const [businessType, setBusinessType] = useState<BusinessType>(
    business?.type ?? 'OTHER',
  );

  const profileMut = useMutation({
    mutationFn: async () => {
      await updateProfile({ name: name.trim() });
      await updateBusiness({
        name: businessName.trim(),
        type: businessType,
      });
    },
    onSuccess: async () => {
      await refreshMe();
      toast.success(t('profileSaved'));
    },
    onError: () => {
      toast.error(t('saveFailed'));
    },
  });

  const businessTypeOptions = BUSINESS_TYPES.map((type) => ({
    value: type,
    label: t(`bizType_${type}` as MessageKey),
  }));

  return {
    user,
    name,
    setName,
    businessName,
    setBusinessName,
    businessType,
    setBusinessType,
    businessTypeOptions,
    profileMut,
    t,
  };
}
