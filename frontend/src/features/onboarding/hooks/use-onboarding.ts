import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { updateBusiness, type BusinessGoal } from '@/features/business/api';
import { paths } from '@/routes/paths';

export const ONBOARDING_GOALS: BusinessGoal[] = [
  'MORE_MESSAGES',
  'MORE_LEADS',
  'MORE_ORDERS',
  'BOOK_APPOINTMENTS',
  'INCREASE_SALES',
];

export function useOnboarding() {
  const { business, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState(business?.description ?? '');
  const [averagePriceEgp, setAveragePriceEgp] = useState(
    business?.averagePriceEgp?.toString() ?? '',
  );
  const [operatingArea, setOperatingArea] = useState(
    business?.operatingArea ?? '',
  );
  const [primaryGoal, setPrimaryGoal] = useState<BusinessGoal>(
    business?.primaryGoal ?? 'MORE_ORDERS',
  );
  const [deliveryInfo, setDeliveryInfo] = useState(
    business?.deliveryInfo ?? '50 ج.م داخل القاهرة',
  );
  const [workingHours, setWorkingHours] = useState(
    business?.workingHours ?? '10 ص – 11 م',
  );
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await updateBusiness({
        description: description.trim() || undefined,
        averagePriceEgp: averagePriceEgp ? Number(averagePriceEgp) : undefined,
        operatingArea: operatingArea.trim() || undefined,
        primaryGoal,
        deliveryInfo: deliveryInfo.trim() || undefined,
        workingHours: workingHours.trim() || undefined,
        contactChannels: ['FACEBOOK', 'INSTAGRAM'],
        completeOnboarding: true,
      });
      await refreshMe();
      navigate(paths.app, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return {
    step,
    setStep,
    description,
    setDescription,
    averagePriceEgp,
    setAveragePriceEgp,
    operatingArea,
    setOperatingArea,
    primaryGoal,
    setPrimaryGoal,
    deliveryInfo,
    setDeliveryInfo,
    workingHours,
    setWorkingHours,
    saving,
    finish,
  };
}
