import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { updateBusiness } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

export function useKnowledgeSettings() {
  const { t } = useLocale();
  const { business, refreshMe } = useAuth();

  const [faqs, setFaqs] = useState(business?.faqs ?? '');
  const [deliveryInfo, setDeliveryInfo] = useState(
    business?.deliveryInfo ?? '',
  );
  const [workingHours, setWorkingHours] = useState(
    business?.workingHours ?? '',
  );
  const [paymentInfo, setPaymentInfo] = useState(business?.paymentInfo ?? '');

  const saveMut = useMutation({
    mutationFn: () =>
      updateBusiness({
        faqs,
        deliveryInfo,
        workingHours,
        paymentInfo,
      }),
    onSuccess: async () => {
      await refreshMe();
      toast.success(t('profileSaved'));
    },
    onError: () => {
      toast.error(t('saveFailed'));
    },
  });

  return {
    faqs,
    setFaqs,
    deliveryInfo,
    setDeliveryInfo,
    workingHours,
    setWorkingHours,
    paymentInfo,
    setPaymentInfo,
    isSaving: saveMut.isPending,
    save: () => saveMut.mutate(),
  };
}
