import { useMutation } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { updateBusiness, type PlanTier } from '@/features/business/api'
import { useLocale } from '@/features/i18n/locale-context'
import type { MessageKey } from '@/features/i18n/messages'
import { cn } from '@/lib/utils'

const PLANS: Array<{
  id: PlanTier
  priceKey: MessageKey
  featureKeys: MessageKey[]
  highlight?: boolean
}> = [
  {
    id: 'FREE',
    priceKey: 'planPriceFree',
    featureKeys: [
      'planFeatInbox',
      'planFeatProducts',
      'planFeatSimAi',
      'planFeatBasicOrders',
    ],
  },
  {
    id: 'STARTER',
    priceKey: 'planPriceStarter',
    featureKeys: [
      'planFeatMeta',
      'planFeatAiOrders',
      'planFeatNotifications',
      'planFeatLeads',
    ],
    highlight: true,
  },
  {
    id: 'GROWTH',
    priceKey: 'planPriceGrowth',
    featureKeys: [
      'planFeatEverything',
      'planFeatCampaigns',
      'planFeatAnalytics',
      'planFeatPriority',
    ],
  },
]

export function BillingPage() {
  const { t } = useLocale()
  const { business, refreshMe } = useAuth()
  const current = business?.plan ?? 'FREE'

  const switchMut = useMutation({
    mutationFn: (plan: PlanTier) => updateBusiness({ plan }),
    onSuccess: async () => {
      await refreshMe()
    },
  })

  return (
    <PageLayout title={t('navBilling')} description={t('billingIntro')}>
      <div className="w-full rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-ink">
        {t('currentPlanLabel')}:{' '}
        <span className="font-bold text-brand">
          {t(`planName_${current}` as MessageKey)}
        </span>
        <span className="ms-2 text-xs text-muted">({t('billingDemoNote')})</span>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const active = current === plan.id
          return (
            <div
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-surface p-5 shadow-sm',
                plan.highlight
                  ? 'border-brand ring-1 ring-brand/30'
                  : 'border-border',
                active && 'bg-lavender/40',
              )}
            >
              {plan.highlight ? (
                <span className="mb-2 w-fit rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {t('planPopular')}
                </span>
              ) : (
                <span className="mb-2 h-5" />
              )}
              <h2 className="text-lg font-bold text-ink">
                {t(`planName_${plan.id}` as MessageKey)}
              </h2>
              <p className="mt-1 text-2xl font-bold text-ink">
                {t(plan.priceKey)}
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.featureKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-trust" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                variant={active ? 'secondary' : plan.highlight ? 'default' : 'outline'}
                disabled={active || switchMut.isPending}
                onClick={() => switchMut.mutate(plan.id)}
              >
                {active
                  ? t('planCurrent')
                  : switchMut.isPending
                    ? t('saving')
                    : t('planSelect')}
              </Button>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
