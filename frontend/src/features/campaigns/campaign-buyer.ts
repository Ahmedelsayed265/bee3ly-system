import type { Campaign } from '@/features/business/api';

/** Design picture before an ad account is connected: 50 EGP CPM and a 2% CTR. */
const DESIGN_CPM = 50;
const DESIGN_CTR = 0.02;

export type BuyerLedger = {
  revenue: number;
  adCost: number;
  costOfGoods: number | null;
  shipping: number | null;
  returnShipping: number | null;
  returnedOrders: number;
  returnedRevenue: number;
  result: number | null;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversations: number;
  leads: number;
  orders: number;
  clickToConversation: number;
  costPerConversation: number;
  cpl: number;
  cpa: number;
  conversationToLead: number;
  leadToOrder: number;
};

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function picture(input: {
  adCost: number;
  impressions: number;
  clicks: number;
  conversations: number;
  leads: number;
  orders: number;
  revenue: number;
  costOfGoods: number | null;
  shipping: number | null;
  returnShipping: number | null;
  returnedOrders: number;
  returnedRevenue: number;
}): BuyerLedger {
  const {
    adCost,
    impressions,
    clicks,
    conversations,
    leads,
    orders,
    revenue,
    costOfGoods,
    shipping,
    returnShipping,
    returnedOrders,
    returnedRevenue,
  } = input;
  const each = (count: number) => (count > 0 ? roundTo(adCost / count, 1) : 0);
  const share = (part: number, whole: number) =>
    whole > 0 ? roundTo((part / whole) * 100, 1) : 0;

  return {
    revenue,
    adCost,
    costOfGoods,
    shipping,
    returnShipping,
    returnedOrders,
    returnedRevenue,
    result:
      costOfGoods == null || shipping == null || returnShipping == null
        ? null
        : roundTo(
            revenue - adCost - costOfGoods - shipping - returnShipping,
            1,
          ),
    roas: adCost > 0 ? roundTo(revenue / adCost, 2) : 0,
    impressions,
    clicks,
    ctr: share(clicks, impressions),
    cpm: impressions > 0 ? roundTo((adCost / impressions) * 1000, 1) : 0,
    cpc: each(clicks),
    conversations,
    leads,
    orders,
    clickToConversation: share(conversations, clicks),
    costPerConversation: each(conversations),
    cpl: each(leads),
    cpa: each(orders),
    conversationToLead: share(leads, conversations),
    leadToOrder: share(orders, leads),
  };
}

export function buyerLedger(campaign: Campaign): BuyerLedger {
  const adCost = campaign.budget;
  const impressions = Math.round((adCost / DESIGN_CPM) * 1000);
  const clicks = Math.round(impressions * DESIGN_CTR);
  const revenue = campaign.revenueEgp ?? 0;

  return picture({
    adCost,
    impressions,
    clicks,
    conversations: campaign.conversations ?? 0,
    leads: campaign.leads ?? 0,
    orders: campaign.orders ?? 0,
    revenue,
    costOfGoods: campaign.costOfGoodsEgp ?? null,
    shipping: campaign.shippingEgp ?? null,
    returnShipping: campaign.returnShippingEgp ?? null,
    returnedOrders: campaign.returnedOrders ?? 0,
    returnedRevenue: campaign.returnedRevenueEgp ?? 0,
  });
}

export function sumLedgers(campaigns: Campaign[]): BuyerLedger {
  const totals = campaigns.reduce(
    (sum, campaign) => {
      const ledger = buyerLedger(campaign);
      sum.adCost += ledger.adCost;
      sum.impressions += ledger.impressions;
      sum.clicks += ledger.clicks;
      sum.conversations += ledger.conversations;
      sum.leads += ledger.leads;
      sum.orders += ledger.orders;
      sum.revenue += ledger.revenue;
      sum.returnedOrders += ledger.returnedOrders;
      sum.returnedRevenue += ledger.returnedRevenue;
      if (
        ledger.costOfGoods == null ||
        ledger.shipping == null ||
        ledger.returnShipping == null
      ) {
        sum.costsKnown = false;
      } else if (sum.costsKnown) {
        sum.costOfGoods += ledger.costOfGoods;
        sum.shipping += ledger.shipping;
        sum.returnShipping += ledger.returnShipping;
      }
      return sum;
    },
    {
      adCost: 0,
      impressions: 0,
      clicks: 0,
      conversations: 0,
      leads: 0,
      orders: 0,
      revenue: 0,
      costOfGoods: 0,
      shipping: 0,
      returnShipping: 0,
      returnedOrders: 0,
      returnedRevenue: 0,
      costsKnown: true,
    },
  );

  return picture({
    ...totals,
    costOfGoods: totals.costsKnown ? totals.costOfGoods : null,
    shipping: totals.costsKnown ? totals.shipping : null,
    returnShipping: totals.costsKnown ? totals.returnShipping : null,
  });
}
