import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Lock, Mail } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { InputField } from '@/components/ui/input-field'
import { Label } from '@/components/ui/label'
import { SocialButton } from '@/components/ui/social-button'
import { SubmitButton } from '@/components/ui/submit-button'
import { AuthShell } from '@/features/auth/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import { useLocale } from '@/features/i18n/locale-context'

type FormValues = {
  email: string
  password: string
  remember?: boolean
}

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const resetSuccess = Boolean(
    (location.state as { resetSuccess?: boolean } | null)?.resetSuccess,
  )

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')),
        remember: z.boolean().optional(),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  })

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await login({ email: values.email, password: values.password })
      navigate('/app', { replace: true })
    } catch {
      setError(t('invalidCredentials'))
    }
  })

  return (
    <AuthShell
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      footer={
        <>
          {t('loginNoAccount')}{' '}
          <Link to="/register" className="font-bold text-brand hover:underline">
            {t('loginCreateAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" key={locale}>
        {resetSuccess ? (
          <p className="rounded-[14px] border border-trust/30 bg-trust/10 px-3 py-2 text-sm text-trust">
            {t('resetSuccess')}
          </p>
        ) : null}

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
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <Label
                  htmlFor="remember"
                  className="mb-0 cursor-pointer text-[13px] font-medium text-muted"
                >
                  {t('rememberMe')}
                </Label>
              </div>
            )}
          />
          <Link to="/forgot-password" className="font-semibold text-brand hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <SubmitButton
          label={t('signIn')}
          loadingLabel={t('signingIn')}
          loading={form.formState.isSubmitting}
        />

        <div className="relative py-3 text-center">
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <span className="relative bg-auth-bg px-3 text-[12px] text-muted">
            {t('orContinueWith')}
          </span>
        </div>

        <div className="space-y-2.5">
          <SocialButton provider="google" label={t('continueGoogle')} />
          <SocialButton provider="apple" label={t('continueApple')} />
        </div>
      </form>
    </AuthShell>
  )
}
