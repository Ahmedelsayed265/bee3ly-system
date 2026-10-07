import {
  BarChart3,
  Bot,
  Code2,
  HardDrive,
  Headphones,
  Megaphone,
  MessageCircle,
  Package,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import type { CatalogPlan } from '@/features/billing/api';
import {
  exportLabel,
  formatPlanPrice,
  formatStorage,
  reportLabel,
  supportLabel,
} from '@/features/billing/plan-copy';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type BillingComparisonTableProps = {
  plans: CatalogPlan[];
  t: (key: MessageKey, params?: Record<string, string>) => string;
};

export function BillingComparisonTable({ plans, t }: BillingComparisonTableProps) {
  const rows = comparisonRows(t);

  return (
    <section className="border-border bg-surface w-full overflow-hidden rounded-3xl border">
      <h2 className="text-ink px-5 pt-5 text-lg font-bold">{t('compareTitle')}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="px-5 py-4" />
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className={cn(
                    'px-4 py-4 text-center',
                    plan.highlighted && 'bg-brand/5',
                  )}
                >
                  <div className="text-ink font-bold">
                    {t(`planName_${plan.id}` as MessageKey)}
                  </div>
                  <div className="text-brand mt-1 text-sm font-semibold">
                    {formatPlanPrice(plan.monthly)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-border border-b last:border-0">
                <th className="text-ink px-5 py-3 text-start font-medium">
                  <RowLabel icon={row.icon} label={row.label} />
                </th>
                {plans.map((plan) => (
                  <td
                    key={plan.id}
                    className={cn(
                      'text-ink px-4 py-3 text-center',
                      plan.highlighted && 'bg-brand/5',
                    )}
                  >
                    {row.cell(plan)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RowLabel({
  icon: Icon,
  label,
}: {
  icon: typeof Share2;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="text-muted size-4 shrink-0" />
      {label}
    </span>
  );
}

function comparisonRows(
  t: (key: MessageKey, params?: Record<string, string>) => string,
) {
  const count = (value: number) =>
    value > 0 ? value.toLocaleString() : '—';
  return [
    {
      icon: Share2,
      label: t('compareChannels'),
      cell: (plan: CatalogPlan) => count(plan.limits.socialChannels),
    },
    {
      icon: MessageCircle,
      label: t('compareWhatsapp'),
      cell: (plan: CatalogPlan) => count(plan.limits.whatsappNumbers),
    },
    {
      icon: Users,
      label: t('compareTeam'),
      cell: (plan: CatalogPlan) => count(plan.limits.teamMembers),
    },
    {
      icon: Package,
      label: t('compareProducts'),
      cell: (plan: CatalogPlan) => count(plan.limits.products),
    },
    {
      icon: ShoppingBag,
      label: t('compareOrdersMonthly'),
      cell: (plan: CatalogPlan) => count(plan.limits.ordersPerMonth),
    },
    {
      icon: MessageCircle,
      label: t('compareConversationsMonthly'),
      cell: (plan: CatalogPlan) => count(plan.limits.conversationsPerMonth),
    },
    {
      icon: Megaphone,
      label: t('compareCampaignsActive'),
      cell: (plan: CatalogPlan) => count(plan.limits.activeCampaigns),
    },
    {
      icon: Sparkles,
      label: t('compareAdAccountsShort'),
      cell: (plan: CatalogPlan) => count(plan.limits.adAccounts),
    },
    {
      icon: BarChart3,
      label: t('compareReport'),
      cell: (plan: CatalogPlan) => reportLabel(plan, t),
    },
    {
      icon: Bot,
      label: t('compareAiMonthly'),
      cell: (plan: CatalogPlan) => count(plan.limits.aiActions),
    },
    {
      icon: BarChart3,
      label: t('compareExports'),
      cell: (plan: CatalogPlan) => exportLabel(plan, t),
    },
    {
      icon: Code2,
      label: t('compareApiDaily'),
      cell: (plan: CatalogPlan) => count(plan.limits.apiRequestsPerDay),
    },
    {
      icon: HardDrive,
      label: t('compareStorage'),
      cell: (plan: CatalogPlan) => formatStorage(plan.limits.storageBytes),
    },
    {
      icon: Headphones,
      label: t('compareSupport'),
      cell: (plan: CatalogPlan) => supportLabel(plan, t),
    },
  ];
}
