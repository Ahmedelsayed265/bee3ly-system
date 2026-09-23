import type { Campaign } from '@/features/business/api';

export type ConnectedCampaign = Campaign & {
  spendEgp: number;
  impressions: number;
  clicks: number;
};

const blank = {
  offer: '',
  audienceDescription: '',
  currency: 'EGP',
  valueProposition: null,
  suggestedMessaging: null,
  suggestedCta: null,
  suggestedCreative: null,
  channel: 'FACEBOOK_INSTAGRAM',
  createdAt: '2026-09-01T00:00:00.000Z',
};

/** Totals match the winter example: spend 5,000, 100,000 impressions, 2,000 clicks, ROAS 4x. */
export const previewCampaigns: ConnectedCampaign[] = [
  {
    ...blank,
    id: 'preview-winter',
    name: 'مجموعة الشتاء',
    objective: 'MORE_ORDERS',
    status: 'ACTIVE',
    budget: 3_200,
    spendEgp: 3_200,
    impressions: 64_000,
    clicks: 1_280,
    conversations: 280,
    leads: 62,
    orders: 18,
    revenueEgp: 12_400,
  },
  {
    ...blank,
    id: 'preview-returning',
    name: 'شتوي للعملاء السابقين',
    objective: 'RETARGETING',
    status: 'ACTIVE',
    budget: 1_200,
    spendEgp: 1_200,
    impressions: 20_000,
    clicks: 480,
    conversations: 90,
    leads: 24,
    orders: 9,
    revenueEgp: 6_100,
  },
  {
    ...blank,
    id: 'preview-messages',
    name: 'رسائل العروض',
    objective: 'MORE_MESSAGES',
    status: 'PAUSED',
    budget: 400,
    spendEgp: 400,
    impressions: 8_000,
    clicks: 160,
    conversations: 70,
    leads: 14,
    orders: 3,
    revenueEgp: 1_500,
  },
  {
    ...blank,
    id: 'preview-awareness',
    name: 'وصول البراند',
    objective: 'AWARENESS',
    status: 'ACTIVE',
    budget: 200,
    spendEgp: 200,
    impressions: 8_000,
    clicks: 80,
    conversations: 60,
    leads: 0,
    orders: 0,
    revenueEgp: 0,
  },
];

export type ConnectedTotals = {
  spendEgp: number;
  impressions: number;
  clicks: number;
  conversations: number;
  leads: number;
  orders: number;
  revenueEgp: number;
  ctr: number | null;
  clickToConversation: number | null;
  conversationToLead: number | null;
  leadToOrder: number | null;
  cpc: number | null;
  cpm: number | null;
  costPerConversation: number | null;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
};

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function connectedRates(input: {
  spendEgp: number;
  impressions: number;
  clicks: number;
  conversations: number;
  leads: number;
  orders: number;
  revenueEgp: number;
}) {
  const share = (part: number, whole: number) =>
    whole > 0 ? roundTo((part / whole) * 100, 1) : null;
  const each = (count: number) =>
    count > 0 ? roundTo(input.spendEgp / count, 1) : null;
  return {
    ctr: share(input.clicks, input.impressions),
    clickToConversation: share(input.conversations, input.clicks),
    conversationToLead: share(input.leads, input.conversations),
    leadToOrder: share(input.orders, input.leads),
    cpc: each(input.clicks),
    cpm:
      input.impressions > 0
        ? roundTo((input.spendEgp / input.impressions) * 1000, 1)
        : null,
    costPerConversation: each(input.conversations),
    cpl: each(input.leads),
    cpa: each(input.orders),
    roas:
      input.spendEgp > 0 ? roundTo(input.revenueEgp / input.spendEgp, 2) : null,
  };
}

export function connectedTotals(
  campaigns: ConnectedCampaign[],
): ConnectedTotals {
  const totals = campaigns.reduce(
    (sum, campaign) => ({
      spendEgp: sum.spendEgp + campaign.spendEgp,
      impressions: sum.impressions + campaign.impressions,
      clicks: sum.clicks + campaign.clicks,
      conversations: sum.conversations + (campaign.conversations ?? 0),
      leads: sum.leads + (campaign.leads ?? 0),
      orders: sum.orders + (campaign.orders ?? 0),
      revenueEgp: sum.revenueEgp + (campaign.revenueEgp ?? 0),
    }),
    {
      spendEgp: 0,
      impressions: 0,
      clicks: 0,
      conversations: 0,
      leads: 0,
      orders: 0,
      revenueEgp: 0,
    },
  );
  return { ...totals, ...connectedRates(totals) };
}

export const previewSummary = connectedTotals(previewCampaigns);
