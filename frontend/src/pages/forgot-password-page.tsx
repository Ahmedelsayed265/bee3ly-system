import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { InputField } from '@/components/ui/input-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { AuthShell } from '@/features/auth/auth-shell'
import { forgotPassword } from '@/features/auth/api'
import { useLocale } from '@/features/i18n/locale-context'

type FormValues = {
  email: string
}

export function ForgotPasswordPage() {
  const { t, locale } = useLocale()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [devResetPath, setDevResetPath] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('emailInvalid')),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setDevResetPath(null)
    try {
      const result = await forgotPassword(values)
      setSent(true)
      if (result.resetToken) {
        setDevResetPath(`/reset-password?token=${result.resetToken}`)
      }
    } catch {
      setError(t('forgotFailed'))
    }
  })

  return (
    <AuthShell
      title={t('forgotTitle')}
      subtitle={t('forgotSubtitle')}
      footer={
        <>
          {t('forgotRemember')}{' '}
          <Link to="/login" className="font-bold text-brand hover:underline">
            {t('registerSignIn')}
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm leading-7 text-muted">{t('forgotSent')}</p>
          {devResetPath ? (
            <p className="rounded-[14px] border border-border bg-surface p-3 text-start text-xs leading-6 text-muted">
              <span className="font-semibold text-ink">{t('forgotDevHint')}</span>
              <br />
              <Link to={devResetPath} className="break-all text-brand underline">
                {devResetPath}
              </Link>
            </p>
          ) : null}
          <Link
            to="/login"
            className="inline-flex h-[48px] w-full items-center justify-center rounded-[14px] border border-border bg-surface text-[13px] font-semibold text-ink transition hover:bg-lavender"
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

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <SubmitButton
            label={t('forgotSubmit')}
            loadingLabel={t('forgotSubmitting')}
            loading={form.formState.isSubmitting}
          />
        </form>
      )}
    </AuthShell>
  )
}
