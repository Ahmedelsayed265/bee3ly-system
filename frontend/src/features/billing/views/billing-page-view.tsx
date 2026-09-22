import { PageLayout } from '@/components/layout/page-layout';
import { BillingPlanCard } from '@/features/billing/components/billing-plan-card';
import { BILLING_PLANS } from '@/features/billing/constants';
import { useBilling } from '@/features/billing/hooks/use-billing';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export function BillingPageView() {
  const { t } = useLocale();
  const { current, switchMut } = useBilling();

  return (
    <PageLayout title={t('navBilling')} description={t('billingIntro')}>
      <div className="border-brand/20 bg-brand/5 text-ink w-full rounded-2xl border px-4 py-3 text-sm">
        {t('currentPlanLabel')}:{' '}
        <span className="text-brand font-bold">
          {t(`planName_${current}` as MessageKey)}
        </span>
        <span className="text-muted ms-2 text-xs">
          ({t('billingDemoNote')})
        </span>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BILLING_PLANS.map((plan) => (
          <BillingPlanCard
            key={plan.id}
            id={plan.id}
            priceKey={plan.priceKey}
            featureKeys={plan.featureKeys}
            highlight={plan.highlight}
            active={current === plan.id}
            isPending={switchMut.isPending}
            onSelect={(id) => switchMut.mutate(id)}
            t={t}
          />
        ))}
      </div>
    </PageLayout>
  );
}
