import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { forgotPassword } from '@/features/auth/api';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export type ForgotPasswordFormValues = {
  email: string;
};

export function useForgotPasswordForm() {
  const { t, locale } = useLocale();
  const [sent, setSent] = useState(false);
  const [devResetPath, setDevResetPath] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailInvalid')),
      }),
    [t],
  );

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setDevResetPath(null);
    try {
      const result = await forgotPassword(values);
      setSent(true);
      toast.success(t('forgotSent'));
      if (result.resetToken) {
        setDevResetPath(`${paths.resetPassword}?token=${result.resetToken}`);
      }
    } catch {
      toast.error(t('forgotFailed'));
    }
  });

  return { form, onSubmit, sent, devResetPath, t, locale };
}
