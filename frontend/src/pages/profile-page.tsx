import { useMutation } from '@tanstack/react-query'
import { HelpCircle, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { SelectField } from '@/components/ui/select-field'
import { useAuth } from '@/features/auth/auth-context'
import {
  changePassword,
  updateBusiness,
  updateProfile,
  type BusinessType,
} from '@/features/business/api'
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

const SUPPORT_EMAIL = 'support@bee3ly.com'

export function ProfilePage() {
  const { t } = useLocale()
  const { user, business, refreshMe } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [businessName, setBusinessName] = useState(business?.name ?? '')
  const [businessType, setBusinessType] = useState<BusinessType>(
    business?.type ?? 'OTHER',
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const profileMut = useMutation({
    mutationFn: async () => {
      await updateProfile({ name: name.trim() })
      await updateBusiness({
        name: businessName.trim(),
        type: businessType,
      })
    },
    onSuccess: async () => {
      await refreshMe()
      toast.success(t('profileSaved'))
    },
    onError: () => {
      toast.error(t('saveFailed'))
    },
  })

  const passwordMut = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success(t('passwordChanged'))
    },
    onError: () => {
      toast.error(t('currentPasswordWrong'))
    },
  })

  return (
    <PageLayout
      title={t('navProfile')}
      description={t('profileIntro')}
      actions={
        <Link
          to="/app/billing"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-brand hover:bg-lavender"
        >
          {t('managePlan')}
        </Link>
      }
    >
      <div className="grid w-full gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold text-ink">{t('accountSection')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="profileName"
              label={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <InputField
              id="profileEmail"
              label={t('email')}
              value={user?.email ?? ''}
              disabled
            />
            <InputField
              id="bizName"
              label={t('businessName')}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <SelectField
              id="bizType"
              label={t('businessType')}
              value={businessType}
              onValueChange={(v) => setBusinessType(v as BusinessType)}
              options={BUSINESS_TYPES.map((type) => ({
                value: type,
                label: t(`bizType_${type}` as MessageKey),
              }))}
            />
          </div>
          <Button
            onClick={() => profileMut.mutate()}
            disabled={profileMut.isPending || name.trim().length < 2}
          >
            {profileMut.isPending ? t('saving') : t('saveProfile')}
          </Button>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold text-ink">{t('securitySection')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="currentPassword"
              type="password"
              label={t('currentPassword')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              containerClassName="sm:col-span-2"
            />
            <InputField
              id="newPassword"
              type="password"
              label={t('newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <InputField
              id="confirmPassword"
              type="password"
              label={t('confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (newPassword.length < 8) {
                toast.error(t('passwordMin'))
                return
              }
              if (newPassword !== confirmPassword) {
                toast.error(t('passwordMismatch'))
                return
              }
              passwordMut.mutate()
            }}
            disabled={passwordMut.isPending}
          >
            {passwordMut.isPending ? t('saving') : t('changePassword')}
          </Button>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 xl:col-span-2">
          <div>
            <h2 className="font-semibold text-ink">{t('supportSection')}</h2>
            <p className="mt-1 text-sm text-muted">{t('supportIntro')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="https://bee3ly.com/help"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-xl border border-border bg-page p-4 transition-colors hover:border-brand/30 hover:bg-lavender"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <HelpCircle className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t('helpCenter')}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">
                  {t('helpCenterHint')}
                </span>
              </span>
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-page p-4 transition-colors hover:border-brand/30 hover:bg-lavender"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t('contactUs')}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">
                  {t('contactUsHint')}
                </span>
                <span className="mt-1 block text-xs font-medium text-brand">
                  {SUPPORT_EMAIL}
                </span>
              </span>
            </a>
          </div>
        </section>
      </div>
    </PageLayout>
  )
}
