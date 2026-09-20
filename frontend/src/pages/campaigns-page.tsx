import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input-field'
import {
  createCampaign,
  fetchCampaigns,
  launchCampaign,
  type Campaign,
} from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'

const OBJECTIVES = [
  'MORE_ORDERS',
  'MORE_LEADS',
  'MORE_BOOKINGS',
  'MORE_MESSAGES',
] as const

export function CampaignsPage() {
  const { t } = useLocale()
  const qc = useQueryClient()
  const listQuery = useQuery({ queryKey: ['campaigns'], queryFn: fetchCampaigns })
  const [step, setStep] = useState(0)
  const [offer, setOffer] = useState('')
  const [objective, setObjective] =
    useState<(typeof OBJECTIVES)[number]>('MORE_ORDERS')
  const [audience, setAudience] = useState('')
  const [budget, setBudget] = useState('500')
  const [valueProp, setValueProp] = useState('')
  const [created, setCreated] = useState<Campaign | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (data) => {
      setCreated(data.campaign)
      setStep(5)
      await qc.invalidateQueries({ queryKey: ['campaigns'] })
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const launchMut = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: 'ASSISTED_LAUNCH' | 'SIMULATED'
    }) => launchCampaign(id, status),
    onSuccess: async (data) => {
      setNotice(data.notice)
      setCreated(data.campaign)
      await qc.invalidateQueries({ queryKey: ['campaigns'] })
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const resetWizard = () => {
    setStep(0)
    setOffer('')
    setAudience('')
    setBudget('500')
    setValueProp('')
    setCreated(null)
    setNotice(null)
  }

  return (
    <PageLayout title={t('navCampaigns')} description={t('campaignsIntro')}>
      <div className="grid w-full gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="mb-4 text-sm font-semibold text-ink">
            {t('campaignWizardTitle')}
          </p>

          {step === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t('campaignStepOffer')}</p>
              <InputField
                id="offer"
                label={t('campaignOfferLabel')}
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder={t('campaignOfferPlaceholder')}
              />
              <Button disabled={offer.trim().length < 2} onClick={() => setStep(1)}>
                {t('next')}
              </Button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t('campaignStepGoal')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OBJECTIVES.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setObjective(o)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-start text-sm',
                      objective === o
                        ? 'border-brand bg-brand/10'
                        : 'border-border hover:bg-lavender',
                    )}
                  >
                    {t(`campaignObj_${o}` as MessageKey)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  {t('back')}
                </Button>
                <Button onClick={() => setStep(2)}>{t('next')}</Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t('campaignStepAudience')}</p>
              <InputField
                id="audience"
                label={t('campaignAudienceLabel')}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={t('campaignAudiencePlaceholder')}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {t('back')}
                </Button>
                <Button
                  disabled={audience.trim().length < 2}
                  onClick={() => setStep(3)}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t('campaignStepBudget')}</p>
              <InputField
                id="budget"
                type="number"
                label={t('campaignBudgetLabel')}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  {t('back')}
                </Button>
                <Button
                  disabled={Number(budget) < 50}
                  onClick={() => setStep(4)}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t('campaignStepValue')}</p>
              <InputField
                id="valueProp"
                label={t('campaignValueLabel')}
                value={valueProp}
                onChange={(e) => setValueProp(e.target.value)}
                placeholder={t('campaignValuePlaceholder')}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  {t('back')}
                </Button>
                <Button
                  disabled={createMut.isPending}
                  onClick={() =>
                    createMut.mutate({
                      offer: offer.trim(),
                      objective,
                      audienceDescription: audience.trim(),
                      budget: Number(budget),
                      valueProposition: valueProp.trim() || undefined,
                    })
                  }
                >
                  {t('campaignGenerate')}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 5 && created ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-trust/10 px-4 py-3 text-sm font-semibold text-trust">
                {t('campaignReady')}
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-page p-4 text-sm">
                <p>
                  <span className="text-muted">{t('campaignName')}: </span>
                  {created.name}
                </p>
                <p>
                  <span className="text-muted">{t('campaignOfferLabel')}: </span>
                  {created.offer}
                </p>
                <p>
                  <span className="text-muted">{t('campaignAudienceLabel')}: </span>
                  {created.audienceDescription}
                </p>
                <p>
                  <span className="text-muted">{t('campaignBudgetLabel')}: </span>
                  {created.budget.toLocaleString()} ج.م
                </p>
                {created.suggestedMessaging ? (
                  <p>
                    <span className="text-muted">{t('campaignMessaging')}: </span>
                    {created.suggestedMessaging}
                  </p>
                ) : null}
                {created.suggestedCta ? (
                  <p>
                    <span className="text-muted">CTA: </span>
                    {created.suggestedCta}
                  </p>
                ) : null}
                <p className="text-xs text-muted">{t('campaignNoFakePublish')}</p>
              </div>
              {notice ? (
                <p className="text-sm text-muted">{notice}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    launchMut.mutate({
                      id: created.id,
                      status: 'ASSISTED_LAUNCH',
                    })
                  }
                  disabled={launchMut.isPending}
                >
                  {t('campaignAssistedLaunch')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    launchMut.mutate({ id: created.id, status: 'SIMULATED' })
                  }
                  disabled={launchMut.isPending}
                >
                  {t('campaignSimulate')}
                </Button>
                <Button variant="ghost" onClick={resetWizard}>
                  {t('campaignNew')}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-semibold text-ink">{t('campaignListTitle')}</p>
          {(listQuery.data ?? []).map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-page px-3 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-muted">
                    {t(`campaignObj_${c.objective}` as MessageKey)} ·{' '}
                    {c.budget.toLocaleString()} ج.م
                  </p>
                </div>
                <span className="rounded-full bg-lavender px-2 py-0.5 text-[10px] font-semibold">
                  {t(`campaignStatus_${c.status}` as MessageKey)}
                </span>
              </div>
            </div>
          ))}
          {(listQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">{t('campaignEmpty')}</p>
          ) : null}
        </section>
      </div>
    </PageLayout>
  )
}
