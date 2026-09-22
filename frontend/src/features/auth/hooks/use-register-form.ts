import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-context';
import type { BusinessType } from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';

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

export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  businessName: string;
  businessType: BusinessType;
};

export function useRegisterForm() {
  const { register: registerUser } = useAuth();
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('nameRequired')),
        email: z.string().email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')),
        businessName: z.string().min(2, t('businessNameRequired')),
        businessType: z.enum([
          'RESTAURANT',
          'CAFE',
          'FASHION',
          'PERFUME',
          'BEAUTY',
          'ECOMMERCE',
          'REAL_ESTATE',
          'OTHER',
        ]),
      }),
    [t],
  );

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      businessName: '',
      businessType: 'FASHION',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerUser(values);
      toast.success(t('registerSuccess'));
      navigate(paths.onboarding, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      toast.error(status === 409 ? t('emailTaken') : t('registerFailed'));
    }
  });

  const businessTypeOptions = BUSINESS_TYPES.map((type) => ({
    value: type,
    label: t(`bizType_${type}` as MessageKey),
  }));

  return { form, onSubmit, businessTypeOptions, t, locale };
}
