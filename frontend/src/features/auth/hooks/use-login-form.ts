import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export type LoginFormValues = {
  email: string;
  password: string;
  remember?: boolean;
};

export function useLoginForm() {
  const { login } = useAuth();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = Boolean(
    (location.state as { resetSuccess?: boolean } | null)?.resetSuccess,
  );

  useEffect(() => {
    if (resetSuccess) {
      toast.success(t('resetSuccess'));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [resetSuccess, t, navigate, location.pathname]);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')),
        remember: z.boolean().optional(),
      }),
    [t],
  );

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login({ email: values.email, password: values.password });
      toast.success(t('loginSuccess'));
      navigate(paths.app, { replace: true });
    } catch {
      toast.error(t('invalidCredentials'));
    }
  });

  return { form, onSubmit, t, locale };
}
