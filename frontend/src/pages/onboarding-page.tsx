import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import { useAuth } from '@/features/auth/auth-context'
import { updateBusiness, type BusinessGoal } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'

const GOALS: BusinessGoal[] = [
  'MORE_MESSAGES',
  'MORE_LEADS',
  'MORE_ORDERS',
  'BOOK_APPOINTMENTS',
  'INCREASE_SALES',
]

export function OnboardingPage() {
  const { business, refreshMe } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [description, setDescription] = useState(business?.description ?? '')
  const [averagePriceEgp, setAveragePriceEgp] = useState(
    business?.averagePriceEgp?.toString() ?? '',
  )
  const [operatingArea, setOperatingArea] = useState(
    business?.operatingArea ?? '',
  )
  const [primaryGoal, setPrimaryGoal] = useState<BusinessGoal>(
    business?.primaryGoal ?? 'MORE_ORDERS',
  )
  const [deliveryInfo, setDeliveryInfo] = useState(
    business?.deliveryInfo ?? '50 ج.م داخل القاهرة',
  )
  const [workingHours, setWorkingHours] = useState(
    business?.workingHours ?? '10 ص – 11 م',
  )
  const [saving, setSaving] = useState(false)

  const finish = async () => {
    setSaving(true)
    try {
      await updateBusiness({
        description: description.trim() || undefined,
        averagePriceEgp: averagePriceEgp
          ? Number(averagePriceEgp)
          : undefined,
        operatingArea: operatingArea.trim() || undefined,
        primaryGoal,
        deliveryInfo: deliveryInfo.trim() || undefined,
        workingHours: workingHours.trim() || undefined,
        contactChannels: ['FACEBOOK', 'INSTAGRAM'],
        completeOnboarding: true,
      })
      await refreshMe()
      navigate('/app', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        {t('onboardingStep', { step: String(step + 1), total: '3' })}
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">
        {t('onboardingTitle')}
      </h1>
      <p className="mt-1 text-sm text-muted">{t('onboardingSubtitle')}</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5">
        {step === 0 ? (
          <>
            <InputField
              id="description"
              label={t('onboardingWhatSell')}
              placeholder={t('onboardingWhatSellPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <InputField
              id="avgPrice"
              type="number"
              label={t('onboardingAvgPrice')}
              placeholder="750"
              value={averagePriceEgp}
              onChange={(e) => setAveragePriceEgp(e.target.value)}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <InputField
              id="area"
              label={t('onboardingArea')}
              placeholder={t('onboardingAreaPlaceholder')}
              value={operatingArea}
              onChange={(e) => setOperatingArea(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">
                {t('onboardingGoal')}
              </label>
              <div className="grid gap-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setPrimaryGoal(goal)}
                    className={`rounded-xl border px-3 py-2.5 text-start text-sm ${
                      primaryGoal === goal
                        ? 'border-brand bg-brand/10 text-ink'
                        : 'border-border bg-page text-muted hover:bg-lavender'
                    }`}
                  >
                    {t(`goal_${goal}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <InputField
              id="hours"
              label={t('workingHours')}
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
            />
            <InputField
              id="delivery"
              label={t('deliveryInfo')}
              value={deliveryInfo}
              onChange={(e) => setDeliveryInfo(e.target.value)}
            />
          </>
        ) : null}

        <div className="flex gap-2 pt-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
            >
              {t('back')}
            </Button>
          ) : null}
          {step < 2 ? (
            <Button
              type="button"
              className="flex-1"
              onClick={() => setStep((s) => s + 1)}
            >
              {t('continue')}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
              disabled={saving}
              onClick={() => void finish()}
            >
              {saving ? t('saving') : t('finishOnboarding')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
