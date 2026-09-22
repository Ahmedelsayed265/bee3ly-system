import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { InputField } from '@/components/ui/input-field';
import { Label } from '@/components/ui/label';
import { SocialButton } from '@/components/ui/social-button';
import { SubmitButton } from '@/components/ui/submit-button';
import { AuthShell } from '@/features/auth/auth-shell';
import { useLoginForm } from '@/features/auth/hooks/use-login-form';
import { paths } from '@/routes/paths';

export function LoginPageView() {
  const { form, onSubmit, t, locale } = useLoginForm();

  return (
    <AuthShell
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      footer={
        <>
          {t('loginNoAccount')}{' '}
          <Link
            to={paths.register}
            className="text-brand font-bold hover:underline"
          >
            {t('loginCreateAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" key={locale}>
        <InputField
          id="email"
          type="email"
          icon={Mail}
          label={t('emailOrPhone')}
          autoComplete="email"
          placeholder={t('emailOrPhonePlaceholder')}
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <InputField
          id="password"
          type="password"
          icon={Lock}
          label={t('password')}
          autoComplete="current-password"
          placeholder={t('passwordPlaceholder')}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <div className="flex items-center justify-between pt-0.5 text-[13px]">
          <Controller
            name="remember"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <Label
                  htmlFor="remember"
                  className="text-muted mb-0 cursor-pointer text-[13px] font-medium"
                >
                  {t('rememberMe')}
                </Label>
              </div>
            )}
          />
          <Link
            to={paths.forgotPassword}
            className="text-brand font-semibold hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <SubmitButton
          label={t('signIn')}
          loadingLabel={t('signingIn')}
          loading={form.formState.isSubmitting}
        />

        <div className="relative py-3 text-center">
          <div className="bg-border absolute inset-x-0 top-1/2 h-px" />
          <span className="text-muted dark:bg-surface relative bg-white px-3 text-[12px]">
            {t('orContinueWith')}
          </span>
        </div>

        <div className="flex gap-2 space-y-2.5">
          <SocialButton provider="google" label={t('continueGoogle')} />
          <SocialButton provider="apple" label={t('continueApple')} />
        </div>
      </form>
    </AuthShell>
  );
}
