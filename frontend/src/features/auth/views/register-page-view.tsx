import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Building2, Lock, Mail, User } from 'lucide-react';
import { InputField } from '@/components/ui/input-field';
import { SelectField } from '@/components/ui/select-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { AuthShell } from '@/features/auth/auth-shell';
import { useRegisterForm } from '@/features/auth/hooks/use-register-form';
import { paths } from '@/routes/paths';

export function RegisterPageView() {
  const { form, onSubmit, businessTypeOptions, t, locale } = useRegisterForm();

  return (
    <AuthShell
      title={t('registerTitle')}
      subtitle={t('registerSubtitle')}
      footer={
        <>
          {t('registerHasAccount')}{' '}
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
          id="name"
          icon={User}
          label={t('name')}
          autoComplete="name"
          placeholder={t('namePlaceholder')}
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />

        <InputField
          id="businessName"
          icon={Building2}
          label={t('businessName')}
          placeholder={t('businessNamePlaceholder')}
          error={form.formState.errors.businessName?.message}
          {...form.register('businessName')}
        />

        <Controller
          control={form.control}
          name="businessType"
          render={({ field }) => (
            <SelectField
              id="businessType"
              label={t('businessType')}
              value={field.value}
              onValueChange={field.onChange}
              options={businessTypeOptions}
              error={form.formState.errors.businessType?.message}
            />
          )}
        />

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

        <SubmitButton
          label={t('createAccount')}
          loadingLabel={t('creatingAccount')}
          loading={form.formState.isSubmitting}
        />
      </form>
    </AuthShell>
  );
}
