import { Megaphone, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import type { PublicPlan } from '@/features/billing/api';
import { BillingComparisonTable } from '@/features/billing/components/billing-comparison-table';
import { BillingPlanCard } from '@/features/billing/components/billing-plan-card';
import { useBilling } from '@/features/billing/hooks/use-billing';
import {
  cardLines,
  formatPlanPrice,
  formatStorage,
} from '@/features/billing/plan-copy';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const USAGE_KEYS = [
  'conversations',
  'whatsapp',
  'ai',
  'products',
  'orders',
  'campaigns',
  'team',
  'storage',
  'channels',
  'whatsappNumbers',
  'adAccounts',
  'automations',
  'api',
] as const;

const METER_LABEL: Record<(typeof USAGE_KEYS)[number], MessageKey> = {
  conversations: 'usageConversations',
  whatsapp: 'usageWhatsapp',
  ai: 'usageAi',
  products: 'usageProducts',
  orders: 'usageOrders',
  campaigns: 'usageCampaigns',
  team: 'usageTeam',
  storage: 'usageStorage',
  channels: 'usageChannels',
  whatsappNumbers: 'usageWhatsappNumbers',
  adAccounts: 'usageAdAccounts',
  automations: 'usageAutomations',
  api: 'usageApi',
};

const PLAN_NAME: Record<PublicPlan, MessageKey> = {
  STARTER: 'planName_STARTER',
  GROWTH: 'planName_GROWTH',
  PRO: 'planName_PRO',
};

const PLAN_AUDIENCE: Record<PublicPlan, MessageKey> = {
  STARTER: 'billingAudienceStarter',
  GROWTH: 'billingAudienceGrowth',
  PRO: 'billingAudiencePro',
};

const BILLING_HINTS = [
  { icon: Megaphone, title: 'billingHintAdsTitle', body: 'billingAdSpend' },
  {
    icon: Sparkles,
    title: 'billingHintCreditsTitle',
    body: 'billingCreditsLater',
  },
  { icon: ShieldCheck, title: 'billingHintFairTitle', body: 'billingFairUse' },
] as const;

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentStatusKey(status: string): MessageKey {
  if (status === 'SUCCEEDED') return 'paymentStatus_SUCCEEDED';
  if (status === 'FAILED') return 'paymentStatus_FAILED';
  return 'paymentStatus_PENDING';
}

function planRank(plan: PublicPlan) {
  if (plan === 'STARTER') return 1;
  if (plan === 'GROWTH') return 2;
  return 3;
}

export function BillingPageView() {
  const { t, locale } = useLocale();
  const [devPaymentId, setDevPaymentId] = useState<string | null>(null);
  const { overview, catalog, checkout, confirm, cancel } = useBilling();
  const sub = overview.data?.subscription;
  const usage = overview.data?.usage;

  const onSelect = async (plan: PublicPlan, interval: 'MONTHLY' | 'ANNUAL') => {
    try {
      const result = await checkout.mutateAsync({ plan, interval });
      if (result.mode === 'current') {
        toast.message(t('billingCurrentMatch'));
        return;
      }
      if (result.mode === 'scheduled') {
        toast.success(t('billingScheduled'));
        setDevPaymentId(null);
        return;
      }
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result.devConfirm) {
        setDevPaymentId(result.paymentId);
        toast.message(t('billingDemoNote'));
        return;
      }
      toast.error(t('saveFailed'));
    } catch (error) {
      toast.error(getApiErrorMessage(error) ?? t('saveFailed'));
    }
  };

  return (
    <PageLayout
      title={t('billingChooseTitle')}
      description={t('billingChooseSubtitle')}
    >
      <p className="text-ink text-sm font-medium">{t('billingTrialLine')}</p>

      {overview.data?.restriction === 'TRIAL_ENDED' ? (
        <div className="border-danger/30 bg-danger/5 text-ink w-full rounded-2xl border px-4 py-3 text-sm">
          {t('billingTrialEnded')}
        </div>
      ) : null}
      {overview.data?.restriction === 'SUBSCRIPTION_INACTIVE' ? (
        <div className="border-danger/30 bg-danger/5 text-ink w-full rounded-2xl border px-4 py-3 text-sm">
          {t('billingInactive')}
        </div>
      ) : null}

      <section className="grid w-full gap-3 md:grid-cols-3">
        {BILLING_HINTS.map((hint) => {
          const Icon = hint.icon;
          return (
            <article
              key={hint.title}
              className="border-border bg-surface flex items-start gap-3 rounded-2xl border p-4"
            >
              <span className="bg-brand/10 text-brand inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-ink text-sm font-bold">{t(hint.title)}</p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {t(hint.body)}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {catalog.data ? (
        <>
          <div className="grid w-full items-stretch gap-4 pt-3 md:grid-cols-3">
            {catalog.data.plans.map((plan) => {
              const active =
                !sub?.trialing &&
                sub?.status === 'ACTIVE' &&
                sub.plan === plan.id &&
                sub.interval === 'MONTHLY';
              const downgrade =
                !sub?.trialing &&
                sub?.status === 'ACTIVE' &&
                sub.plan != null &&
                planRank(plan.id) < planRank(sub.plan);
              return (
                <BillingPlanCard
                  key={plan.id}
                  planId={plan.id}
                  name={t(PLAN_NAME[plan.id])}
                  audience={t(PLAN_AUDIENCE[plan.id])}
                  amount={plan.monthly}
                  period={t('billingPerMonthShort')}
                  features={cardLines(plan, t)}
                  highlight={plan.highlighted}
                  popularLabel={t('planPopular')}
                  active={active}
                  pending={checkout.isPending}
                  cta={
                    active
                      ? t('planCurrent')
                      : downgrade
                        ? t('billingDowngrade')
                        : t('billingChoose')
                  }
                  onSelect={() => void onSelect(plan.id, 'MONTHLY')}
                />
              );
            })}
          </div>
          <BillingComparisonTable plans={catalog.data.plans} t={t} />
          <section className="border-border bg-surface w-full rounded-3xl border p-5">
            <div className="mb-4">
              <h2 className="text-ink text-lg font-bold">
                {t('billingAnnualPlans')}
              </h2>
              <p className="text-muted mt-1 text-sm">
                {t('billingAnnualSave')}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {catalog.data.plans.map((plan) => {
                const active =
                  !sub?.trialing &&
                  sub?.status === 'ACTIVE' &&
                  sub.plan === plan.id &&
                  sub.interval === 'ANNUAL';
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={active || checkout.isPending}
                    onClick={() => void onSelect(plan.id, 'ANNUAL')}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-start transition-colors disabled:opacity-60',
                      plan.highlighted
                        ? 'border-brand bg-brand/5'
                        : 'border-border hover:bg-page',
                    )}
                  >
                    <span className="text-ink block text-sm font-bold">
                      {t(PLAN_NAME[plan.id])}
                    </span>
                    <span className="text-ink mt-2 block text-2xl font-bold">
                      {formatPlanPrice(plan.annual)}
                    </span>
                    <span className="text-muted mt-1 block text-xs">
                      {t('billingAnnual')}
                    </span>
                    <span className="text-brand mt-3 block text-sm font-semibold">
                      {active ? t('planCurrent') : t('billingChoose')}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <section className="border-border bg-surface w-full rounded-3xl border p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted text-xs font-medium">
              {t('currentPlanLabel')}
            </p>
            <p className="text-ink mt-1 text-xl font-bold">
              {sub?.trialing
                ? t('planName_TRIAL')
                : sub?.plan
                  ? t(PLAN_NAME[sub.plan])
                  : t('loading')}
            </p>
          </div>
          {sub ? (
            <p className="bg-lavender text-ink rounded-full px-3 py-1 text-xs font-semibold">
              {sub.trialing && sub.trialEndsAt
                ? t('billingTrialEnds', {
                    date: new Date(sub.trialEndsAt).toLocaleDateString(
                      locale === 'ar' ? 'ar-EG' : 'en-GB',
                    ),
                  })
                : `${t('billingNext')}: ${new Date(sub.currentPeriodEnd).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB')}`}
            </p>
          ) : null}
        </div>
        {usage ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {USAGE_KEYS.map((key) => {
              const meter = usage[key];
              const included = meter.limit > 0;
              const ratio = included
                ? Math.min(100, Math.round((meter.used / meter.limit) * 100))
                : 0;
              const value =
                key === 'storage'
                  ? `${formatStorage(meter.used)} / ${included ? formatStorage(meter.limit) : t('billingNotIncluded')}`
                  : included
                    ? `${meter.used.toLocaleString()} / ${meter.limit.toLocaleString()}`
                    : t('billingNotIncluded');
              return (
                <div key={key} className="bg-page rounded-2xl px-4 py-3">
                  <p className="text-muted text-xs font-medium">
                    {t(METER_LABEL[key])}
                  </p>
                  <p className="text-ink mt-1 text-sm font-bold" dir="ltr">
                    {value}
                  </p>
                  <div className="bg-border mt-3 h-2 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        !included
                          ? 'bg-transparent'
                          : ratio >= 100
                            ? 'bg-danger'
                            : ratio >= 90
                              ? 'bg-brand'
                              : 'bg-trust',
                      )}
                      style={{ width: `${included ? ratio : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {overview.data?.warnings.length ? (
          <ul className="mt-4 space-y-2">
            {overview.data.warnings.map((warning) => (
              <li
                key={`${warning.meter}-${warning.level}`}
                className="bg-brand/5 text-ink rounded-xl px-3 py-2 text-xs"
              >
                {t(
                  warning.level >= 100
                    ? 'usageWarn100'
                    : warning.level >= 90
                      ? 'usageWarn90'
                      : 'usageWarn70',
                  {
                    meter: t(
                      METER_LABEL[
                        warning.meter as (typeof USAGE_KEYS)[number]
                      ] ?? 'usageWhatsapp',
                    ),
                  },
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {devPaymentId && overview.data?.devConfirm ? (
        <Button
          disabled={confirm.isPending}
          onClick={() =>
            void confirm.mutateAsync(devPaymentId).then(() => {
              setDevPaymentId(null);
              toast.success(t('profileSaved'));
            })
          }
        >
          {t('billingDemoNote')}
        </Button>
      ) : null}

      <section className="border-border bg-surface flex w-full flex-wrap items-center justify-between gap-4 rounded-3xl border p-5">
        <div>
          <h2 className="text-ink text-base font-bold">
            {t('billingEnterprise')}
          </h2>
          <p className="text-muted mt-1 max-w-xl text-sm">
            {t('billingEnterpriseBody')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={paths.contact}>{t('billingTalkToUs')}</Link>
          </Button>
          {sub && !sub.trialing && sub.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              disabled={cancel.isPending}
              onClick={() =>
                void cancel
                  .mutateAsync()
                  .then(() => toast.success(t('billingScheduled')))
              }
            >
              {t('billingCancel')}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="border-border bg-surface w-full rounded-3xl border p-5">
        <h2 className="text-ink mb-4 text-lg font-bold">
          {t('billingHistory')}
        </h2>
        {overview.data?.payments.length ? (
          <ul className="space-y-2">
            {overview.data.payments.map((payment) => (
              <li
                key={payment.id}
                className="bg-page flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="text-ink text-sm font-bold">
                    {payment.plan
                      ? t(
                          PLAN_NAME[payment.plan as PublicPlan] ??
                            'planName_GROWTH',
                        )
                      : payment.purpose}
                  </p>
                  <p className="text-muted mt-0.5 text-xs">
                    {new Date(payment.createdAt).toLocaleDateString(
                      locale === 'ar' ? 'ar-EG' : 'en-GB',
                    )}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-ink text-sm font-bold">
                    {formatMoney(payment.amount, payment.currency, locale)}
                  </p>
                  <p
                    className={cn(
                      'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      payment.status === 'SUCCEEDED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : payment.status === 'FAILED'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-lavender text-ink',
                    )}
                  >
                    {t(paymentStatusKey(payment.status))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">{t('billingNoPayments')}</p>
        )}
      </section>
    </PageLayout>
  );
}
