import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { resetPassword } from '@/features/auth/api';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export function useResetPasswordForm() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('passwordMin')),
          confirmPassword: z.string().min(8, t('passwordMin')),
        })
        .refine((values) => values.password === values.confirmPassword, {
          message: t('passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) {
      toast.error(t('resetInvalidToken'));
      return;
    }
    try {
      await resetPassword({ token, password: values.password });
      toast.success(t('resetSuccess'));
      navigate(paths.login, { replace: true, state: { resetSuccess: true } });
    } catch {
      toast.error(t('resetFailed'));
    }
  });

  return { form, onSubmit, token, t, locale };
}
