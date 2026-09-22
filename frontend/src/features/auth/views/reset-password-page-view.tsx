import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { InputField } from '@/components/ui/input-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { AuthShell } from '@/features/auth/auth-shell';
import { useResetPasswordForm } from '@/features/auth/hooks/use-reset-password-form';
import { paths } from '@/routes/paths';

export function ResetPasswordPageView() {
  const { form, onSubmit, token, t, locale } = useResetPasswordForm();

  if (!token) {
    return (
      <AuthShell
        title={t('resetTitle')}
        subtitle={t('resetInvalidToken')}
        footer={
          <Link
            to={paths.forgotPassword}
            className="text-brand font-bold hover:underline"
          >
            {t('forgotSubmit')}
          </Link>
        }
      >
        <Link
          to={paths.login}
          className="border-border bg-surface text-ink hover:bg-lavender inline-flex h-[48px] w-full items-center justify-center rounded-[14px] border text-[13px] font-semibold transition"
        >
          {t('registerSignIn')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('resetTitle')}
      subtitle={t('resetSubtitle')}
      footer={
        <>
          {t('forgotRemember')}{' '}
          <Link
            to={paths.login}
            className="text-brand font-bold hover:underline"
          >
            {t('registerSignIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" key={locale}>
        <InputField
          id="password"
          type="password"
          icon={Lock}
          label={t('password')}
          autoComplete="new-password"
          placeholder={t('passwordMinPlaceholder')}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <InputField
          id="confirmPassword"
          type="password"
          icon={Lock}
          label={t('confirmPassword')}
          autoComplete="new-password"
          placeholder={t('passwordMinPlaceholder')}
          error={form.formState.errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />

        <SubmitButton
          label={t('resetSubmit')}
          loadingLabel={t('resetSubmitting')}
          loading={form.formState.isSubmitting}
        />
      </form>
    </AuthShell>
  );
}
