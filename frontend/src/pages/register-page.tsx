import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Building2, Lock, Mail, User } from 'lucide-react'
import { InputField } from '@/components/ui/input-field'
import { SelectField } from '@/components/ui/select-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { AuthShell } from '@/features/auth/auth-shell'
import { useAuth } from '@/features/auth/auth-context'
import type { BusinessType } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'

const BUSINESS_TYPES: BusinessType[] = [
  'RESTAURANT',
  'CAFE',
  'FASHION',
  'PERFUME',
  'BEAUTY',
  'ECOMMERCE',
  'REAL_ESTATE',
  'OTHER',
]

type FormValues = {
  name: string
  email: string
  password: string
  businessName: string
  businessType: BusinessType
}

export function RegisterPage() {
  const { register: registerUser, isAuthenticated, isLoading } = useAuth()
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('nameRequired')),
        email: z.string().email(t('emailInvalid')),
        password: z.string().min(8, t('passwordMin')),
        businessName: z.string().min(2, t('businessNameRequired')),
        businessType: z.enum([
          'RESTAURANT',
          'CAFE',
          'FASHION',
          'PERFUME',
          'BEAUTY',
          'ECOMMERCE',
          'REAL_ESTATE',
          'OTHER',
        ]),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      businessName: '',
      businessType: 'FASHION',
    },
  })

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await registerUser(values)
      navigate('/app/onboarding', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status
      setError(status === 409 ? t('emailTaken') : t('registerFailed'))
    }
  })

  const businessTypeOptions = BUSINESS_TYPES.map((type) => ({
    value: type,
    label: t(`bizType_${type}` as MessageKey),
  }))

  return (
    <AuthShell
      title={t('registerTitle')}
      subtitle={t('registerSubtitle')}
      footer={
        <>
          {t('registerHasAccount')}{' '}
          <Link to="/login" className="font-bold text-brand hover:underline">
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

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <SubmitButton
          label={t('createAccount')}
          loadingLabel={t('creatingAccount')}
          loading={form.formState.isSubmitting}
        />
      </form>
    </AuthShell>
  )
}
