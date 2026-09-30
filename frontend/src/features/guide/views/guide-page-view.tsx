import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  MessageCircle,
  Rocket,
  Settings,
  ShoppingBag,
  Target,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Pillar = {
  icon: LucideIcon;
  titleKey: MessageKey;
  bodyKey: MessageKey;
};

type FlowStep = {
  titleKey: MessageKey;
  bodyKey: MessageKey;
};

type ChecklistItem = {
  labelKey: MessageKey;
  hintKey: MessageKey;
  to: string;
  ctaKey: MessageKey;
};

const pillars: Pillar[] = [
  {
    icon: Megaphone,
    titleKey: 'guidePillarMediaBuyerTitle',
    bodyKey: 'guidePillarMediaBuyerBody',
  },
  {
    icon: MessageCircle,
    titleKey: 'guidePillarInboxTitle',
    bodyKey: 'guidePillarInboxBody',
  },
  {
    icon: Rocket,
    titleKey: 'guidePillarCampaignsTitle',
    bodyKey: 'guidePillarCampaignsBody',
  },
  {
    icon: Wallet,
    titleKey: 'guidePillarProfitTitle',
    bodyKey: 'guidePillarProfitBody',
  },
];

const flowSteps: FlowStep[] = [
  { titleKey: 'guideFlow1Title', bodyKey: 'guideFlow1Body' },
  { titleKey: 'guideFlow2Title', bodyKey: 'guideFlow2Body' },
  { titleKey: 'guideFlow3Title', bodyKey: 'guideFlow3Body' },
  { titleKey: 'guideFlow4Title', bodyKey: 'guideFlow4Body' },
  { titleKey: 'guideFlow5Title', bodyKey: 'guideFlow5Body' },
  { titleKey: 'guideFlow6Title', bodyKey: 'guideFlow6Body' },
];

const adWizardSteps: MessageKey[] = [
  'guideAdsStepOffer',
  'guideAdsStepGoal',
  'guideAdsStepAudience',
  'guideAdsStepBudget',
  'guideAdsStepCopy',
  'guideAdsStepLaunch',
];

const profitLines: MessageKey[] = [
  'guideProfitLineRevenue',
  'guideProfitLineSpend',
  'guideProfitLineCogs',
  'guideProfitLineShipping',
  'guideProfitLineReturns',
];

const checklist: ChecklistItem[] = [
  {
    labelKey: 'guideCheckProducts',
    hintKey: 'guideCheckProductsHint',
    to: paths.products,
    ctaKey: 'guideCtaProducts',
  },
  {
    labelKey: 'guideCheckShipping',
    hintKey: 'guideCheckShippingHint',
    to: paths.settings,
    ctaKey: 'guideCtaSettings',
  },
  {
    labelKey: 'guideCheckChannels',
    hintKey: 'guideCheckChannelsHint',
    to: paths.settings,
    ctaKey: 'guideCtaChannels',
  },
  {
    labelKey: 'guideCheckAi',
    hintKey: 'guideCheckAiHint',
    to: paths.ai,
    ctaKey: 'guideCtaAi',
  },
  {
    labelKey: 'guideCheckInbox',
    hintKey: 'guideCheckInboxHint',
    to: paths.inbox,
    ctaKey: 'guideCtaInbox',
  },
  {
    labelKey: 'guideCheckCampaign',
    hintKey: 'guideCheckCampaignHint',
    to: paths.campaigns,
    ctaKey: 'guideCtaCampaigns',
  },
];

function Section({
  id,
  icon: Icon,
  title,
  children,
  className,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'border-border bg-surface scroll-mt-24 rounded-2xl border p-5 sm:p-6',
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="bg-brand/10 text-brand inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="text-ink pt-1.5 text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function GuidePageView() {
  const { dir, t } = useLocale();
  const FlowArrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const ListChevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <PageLayout title={t('guidePageTitle')} description={t('guidePageIntro')}>
      <div className="flex flex-col gap-5">
        <div className="border-brand/25 from-brand/8 via-surface to-surface relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-8">
          <p className="text-brand text-xs font-bold tracking-wide uppercase">
            {t('guideHeroEyebrow')}
          </p>
          <h2 className="text-ink mt-2 max-w-2xl text-xl font-bold sm:text-2xl">
            {t('guideHeroTitle')}
          </h2>
          <p className="text-muted mt-3 max-w-3xl text-sm leading-relaxed sm:text-[15px]">
            {t('guideHeroBody')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link to={paths.campaigns}>{t('guideCtaCampaigns')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={paths.settings}>{t('guideCtaChannels')}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="border-border bg-page rounded-2xl border p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="bg-lavender text-ink inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-ink text-sm font-bold">{t(titleKey)}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">
                    {t(bodyKey)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Section icon={Target} title={t('guideFlowTitle')}>
          <p className="text-muted mb-4 text-sm leading-relaxed">
            {t('guideFlowIntro')}
          </p>
          <ol className="space-y-3">
            {flowSteps.map((step, index) => (
              <li
                key={step.titleKey}
                className="border-border bg-page flex gap-3 rounded-xl border p-4"
              >
                <span className="bg-brand text-brand-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold">
                    {t(step.titleKey)}
                  </p>
                  <p className="text-muted mt-1 text-sm leading-relaxed">
                    {t(step.bodyKey)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={Rocket} title={t('guideAdsTitle')}>
          <p className="text-muted mb-4 text-sm leading-relaxed">
            {t('guideAdsIntro')}
          </p>
          <ul className="space-y-2">
            {adWizardSteps.map((key, index) => (
              <li
                key={key}
                className="text-muted flex gap-2 text-sm leading-relaxed"
              >
                <span className="text-brand font-bold">{index + 1}.</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted bg-trust/10 mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed">
            {t('guideAdsLaunchNote')}
          </p>
        </Section>

        <Section icon={BarChart3} title={t('guideAnalysisTitle')}>
          <p className="text-muted mb-4 text-sm leading-relaxed">
            {t('guideAnalysisIntro')}
          </p>
          <div className="border-border bg-page flex flex-wrap items-center gap-2 rounded-xl border p-4 text-xs font-semibold sm:text-sm">
            <span className="text-ink">{t('metric_impressions')}</span>
            <FlowArrow className="text-muted h-4 w-4 shrink-0" />
            <span className="text-ink">{t('metric_clicks')}</span>
            <FlowArrow className="text-muted h-4 w-4 shrink-0" />
            <span className="text-ink">{t('metricConversations')}</span>
            <FlowArrow className="text-muted h-4 w-4 shrink-0" />
            <span className="text-ink">{t('metricLeads')}</span>
            <FlowArrow className="text-muted h-4 w-4 shrink-0" />
            <span className="text-ink">{t('metricOrders')}</span>
          </div>
          <p className="text-muted mt-3 text-sm leading-relaxed">
            {t('guideAnalysisAttribution')}
          </p>
        </Section>

        <Section icon={Wallet} title={t('guideProfitTitle')}>
          <p className="text-muted mb-4 text-sm leading-relaxed">
            {t('guideProfitIntro')}
          </p>
          <div className="border-border bg-page space-y-2 rounded-xl border p-4">
            {profitLines.map((key) => (
              <p key={key} className="text-muted text-sm leading-relaxed">
                {t(key)}
              </p>
            ))}
            <div className="border-border mt-3 border-t pt-3">
              <p className="text-ink text-sm font-bold">
                {t('guideProfitResultLabel')}
              </p>
              <p className="text-brand mt-1 text-sm font-semibold">
                {t('metricFormula_profit')}
              </p>
            </div>
          </div>
          <p className="text-muted mt-3 text-sm leading-relaxed">
            {t('guideProfitRoasNote')}
          </p>
        </Section>

        <Section icon={Brain} title={t('guideTargetingTitle')}>
          <p className="text-muted text-sm leading-relaxed">
            {t('guideTargetingBody')}
          </p>
        </Section>

        <Section icon={Settings} title={t('guideHonestTitle')}>
          <p className="text-muted text-sm leading-relaxed">
            {t('guideHonestBody')}
          </p>
        </Section>

        <Section icon={ShoppingBag} title={t('guideStartTitle')}>
          <p className="text-muted mb-4 text-sm leading-relaxed">
            {t('guideStartIntro')}
          </p>
          <ul className="space-y-3">
            {checklist.map((item) => (
              <li
                key={item.labelKey}
                className="border-border bg-page flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-ink text-sm font-semibold">
                    {t(item.labelKey)}
                  </p>
                  <p className="text-muted mt-1 text-sm">{t(item.hintKey)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  asChild
                >
                  <Link to={item.to} className="gap-1">
                    {t(item.ctaKey)}
                    <ListChevron className="h-4 w-4" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>

        <div className="border-border bg-lavender/40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4">
          <div>
            <p className="text-ink text-sm font-bold">
              {t('guideFooterTitle')}
            </p>
            <p className="text-muted mt-0.5 text-sm">{t('guideFooterBody')}</p>
          </div>
          <Button asChild>
            <Link to={paths.campaigns}>{t('actionCreateCampaign')}</Link>
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
