import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Lock } from 'lucide-react'
import { InputField } from '@/components/ui/input-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { AuthShell } from '@/features/auth/auth-shell'
import { resetPassword } from '@/features/auth/api'
import { useLocale } from '@/features/i18n/locale-context'

type FormValues = {
  password: string
  confirmPassword: string
}

export function ResetPasswordPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [error, setError] = useState<string | null>(null)

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
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    if (!token) {
      setError(t('resetInvalidToken'))
      return
    }
    try {
      await resetPassword({ token, password: values.password })
      navigate('/login', { replace: true, state: { resetSuccess: true } })
    } catch {
      setError(t('resetFailed'))
    }
  })

  if (!token) {
    return (
      <AuthShell
        title={t('resetTitle')}
        subtitle={t('resetInvalidToken')}
        footer={
          <Link to="/forgot-password" className="font-bold text-brand hover:underline">
            {t('forgotSubmit')}
          </Link>
        }
      >
        <Link
          to="/login"
          className="inline-flex h-[48px] w-full items-center justify-center rounded-[14px] border border-border bg-surface text-[13px] font-semibold text-ink transition hover:bg-lavender"
        >
          {t('registerSignIn')}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('resetTitle')}
      subtitle={t('resetSubtitle')}
      footer={
        <>
          {t('forgotRemember')}{' '}
          <Link to="/login" className="font-bold text-brand hover:underline">
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

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <SubmitButton
          label={t('resetSubmit')}
          loadingLabel={t('resetSubmitting')}
          loading={form.formState.isSubmitting}
        />
      </form>
    </AuthShell>
  )
}
