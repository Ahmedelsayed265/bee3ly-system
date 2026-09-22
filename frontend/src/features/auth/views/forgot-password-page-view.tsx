import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { InputField } from '@/components/ui/input-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { AuthShell } from '@/features/auth/auth-shell';
import { useForgotPasswordForm } from '@/features/auth/hooks/use-forgot-password-form';
import { paths } from '@/routes/paths';

export function ForgotPasswordPageView() {
  const { form, onSubmit, sent, devResetPath, t, locale } =
    useForgotPasswordForm();

  return (
    <AuthShell
      title={t('forgotTitle')}
      subtitle={t('forgotSubtitle')}
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
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-muted text-sm leading-7">{t('forgotSent')}</p>
          {devResetPath ? (
            <p className="border-border bg-surface text-muted rounded-[14px] border p-3 text-start text-xs leading-6">
              <span className="text-ink font-semibold">
                {t('forgotDevHint')}
              </span>
              <br />
              <Link
                to={devResetPath}
                className="text-brand break-all underline"
              >
                {devResetPath}
              </Link>
            </p>
          ) : null}
          <Link
            to={paths.login}
            className="border-border bg-surface text-ink hover:bg-lavender inline-flex h-[48px] w-full items-center justify-center rounded-[14px] border text-[13px] font-semibold transition"
          >
            {t('registerSignIn')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" key={locale}>
          <InputField
            id="email"
            type="email"
            icon={Mail}
            label={t('email')}
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />

          <SubmitButton
            label={t('forgotSubmit')}
            loadingLabel={t('forgotSubmitting')}
            loading={form.formState.isSubmitting}
          />
        </form>
      )}
    </AuthShell>
  );
}
