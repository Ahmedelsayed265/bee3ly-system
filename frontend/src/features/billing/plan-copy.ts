import type { CatalogPlan } from '@/features/billing/api';
import type { MessageKey } from '@/features/i18n/messages';

type Translate = (key: MessageKey, params?: Record<string, string>) => string;

function count(value: number) {
  return value.toLocaleString();
}

export function reportLabel(plan: CatalogPlan, t: Translate) {
  if (plan.features.exports === 'advanced' && plan.features.advancedAnalytics) {
    return t('reportAdvancedExport');
  }
  if (plan.features.advancedAnalytics) return t('reportAdvanced');
  return t('reportBasic');
}

export function exportLabel(plan: CatalogPlan, t: Translate) {
  if (plan.features.exports === 'advanced') return t('compareAdvanced');
  if (plan.features.exports === 'yes') return t('compareBasic');
  return '—';
}

export function supportLabel(plan: CatalogPlan, t: Translate) {
  if (plan.features.prioritySupport) return t('supportPriority');
  if (plan.features.advancedAnalytics) return t('supportStandard');
  return t('supportBasic');
}

export function cardLines(plan: CatalogPlan, t: Translate) {
  const limits = plan.limits;
  return [
    t('lineChannels', { count: count(limits.socialChannels) }),
    limits.whatsappNumbers === 1
      ? t('lineWhatsappOne', { count: '1' })
      : t('lineWhatsapp', { count: count(limits.whatsappNumbers) }),
    t('lineTeam', { count: count(limits.teamMembers) }),
    t('lineProducts', { count: count(limits.products) }),
    t('lineOrders', { count: count(limits.ordersPerMonth) }),
    t('lineConversations', { count: count(limits.conversationsPerMonth) }),
    t('lineCampaigns', { count: count(limits.activeCampaigns) }),
    t('lineAdAccounts', { count: count(limits.adAccounts) }),
    reportLabel(plan, t),
    limits.apiRequestsPerDay > 0
      ? t('cardApiUpTo', { count: count(limits.apiRequestsPerDay) })
      : t('cardNoApi'),
    supportLabel(plan, t),
  ];
}

export function formatStorage(bytes: number) {
  const gb = bytes / 1_000_000_000;
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
}

export function formatPlanPrice(amount: number) {
  return `$${amount.toLocaleString()}`;
}
