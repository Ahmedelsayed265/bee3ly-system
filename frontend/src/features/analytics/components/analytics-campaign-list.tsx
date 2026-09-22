import type { MessageKey } from '@/features/i18n/messages';

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  conversations: number;
  leads: number;
  orders: number;
  revenueEgp: number;
};

type AnalyticsCampaignListProps = {
  campaigns: CampaignRow[];
  t: (key: MessageKey, params?: Record<string, string>) => string;
};

export function AnalyticsCampaignList({
  campaigns,
  t,
}: AnalyticsCampaignListProps) {
  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      <h2 className="text-ink mb-3 text-sm font-semibold">
        {t('campaignAttribution')}
      </h2>
      <div className="space-y-2">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="bg-page flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm"
          >
            <div>
              <p className="text-ink font-semibold">{c.name}</p>
              <p className="text-muted text-xs">
                {t(`campaignStatus_${c.status}` as MessageKey)}
              </p>
            </div>
            <div className="text-muted text-xs">
              {c.conversations} {t('metricConversations')} · {c.leads}{' '}
              {t('metricLeads')} · {c.orders} {t('metricOrders')} ·{' '}
              {c.revenueEgp.toLocaleString()} ج.م
            </div>
          </div>
        ))}
        {campaigns.length === 0 ? (
          <p className="text-muted text-sm">{t('campaignEmpty')}</p>
        ) : null}
      </div>
    </section>
  );
}
