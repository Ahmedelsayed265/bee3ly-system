/**
 * Campaign and business metrics.
 *
 * Planned budget is never an input. Ad ratios use actual spend and delivery
 * counts only. A missing input stays null — it is not treated as zero.
 * Cancelled orders must already be excluded by the caller.
 */

export const CAMPAIGN_OBJECTIVES = [
  'MORE_ORDERS',
  'MORE_LEADS',
  'MORE_BOOKINGS',
  'MORE_MESSAGES',
  'AWARENESS',
  'TRAFFIC',
  'ENGAGEMENT',
  'RETARGETING',
] as const;

export type CampaignObjectiveId = (typeof CAMPAIGN_OBJECTIVES)[number];

export type MetricId =
  | 'reach'
  | 'impressions'
  | 'frequency'
  | 'cpm'
  | 'clicks'
  | 'ctr'
  | 'cpc'
  | 'landingPageViews'
  | 'engagements'
  | 'engagementRate'
  | 'costPerEngagement'
  | 'conversations'
  | 'costPerConversation'
  | 'leads'
  | 'cpl'
  | 'leadConversionRate'
  | 'conversationToLeadRate'
  | 'orders'
  | 'cpa'
  | 'leadToOrderRate'
  | 'revenue'
  | 'roas'
  | 'profit';

export type MetricUnit = 'count' | 'egp' | 'percent' | 'multiple';

export type MetricGap =
  | 'missing_spend'
  | 'missing_impressions'
  | 'missing_clicks'
  | 'missing_reach'
  | 'missing_engagements'
  | 'missing_landing_page_views'
  | 'missing_cost'
  | 'missing_shipping'
  | 'divide_by_zero';

export type ComputedMetric = {
  id: MetricId;
  value: number | null;
  unit: MetricUnit;
  gap: MetricGap | null;
  primary: boolean;
};

export type MetricHeadline = {
  id: MetricId;
  value: number;
  unit: MetricUnit;
};

export type ChainInput = {
  conversations: number;
  leads: number;
  orders: number;
  revenueEgp: number;
  /** Null when any sold unit has no recorded cost. Never inferred from price. */
  costOfGoodsEgp: number | null;
  /** Null when any sold unit has no recorded shipping cost. */
  shippingEgp: number | null;
  /** Shipping paid on returned orders. Null when a returned unit has no shipping cost. */
  returnShippingEgp: number | null;
};

export type DeliveryInput = {
  spendEgp: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  engagements: number | null;
  landingPageViews: number | null;
};

export const EMPTY_DELIVERY: DeliveryInput = {
  spendEgp: null,
  impressions: null,
  clicks: null,
  reach: null,
  engagements: null,
  landingPageViews: null,
};

const PRIMARY: Record<CampaignObjectiveId, MetricId[]> = {
  AWARENESS: ['reach', 'impressions', 'cpm', 'frequency'],
  TRAFFIC: ['clicks', 'ctr', 'cpc', 'landingPageViews'],
  ENGAGEMENT: ['engagements', 'engagementRate', 'costPerEngagement'],
  MORE_MESSAGES: ['conversations', 'costPerConversation'],
  MORE_LEADS: ['cpl', 'leadConversionRate', 'leads'],
  MORE_BOOKINGS: ['leads', 'conversationToLeadRate', 'cpl'],
  MORE_ORDERS: ['roas', 'cpa', 'revenue', 'orders'],
  RETARGETING: ['roas', 'cpa', 'revenue', 'orders'],
};

const BUSINESS_PRIMARY: MetricId[] = [
  'conversations',
  'leads',
  'orders',
  'revenue',
  'conversationToLeadRate',
  'leadToOrderRate',
  'roas',
];

const CATALOG: MetricId[] = [
  'impressions',
  'reach',
  'frequency',
  'cpm',
  'clicks',
  'ctr',
  'cpc',
  'landingPageViews',
  'engagements',
  'engagementRate',
  'costPerEngagement',
  'conversations',
  'costPerConversation',
  'leads',
  'cpl',
  'leadConversionRate',
  'conversationToLeadRate',
  'orders',
  'cpa',
  'leadToOrderRate',
  'revenue',
  'roas',
  'profit',
];

const UNITS: Record<MetricId, MetricUnit> = {
  reach: 'count',
  impressions: 'count',
  frequency: 'multiple',
  cpm: 'egp',
  clicks: 'count',
  ctr: 'percent',
  cpc: 'egp',
  landingPageViews: 'count',
  engagements: 'count',
  engagementRate: 'percent',
  costPerEngagement: 'egp',
  conversations: 'count',
  costPerConversation: 'egp',
  leads: 'count',
  cpl: 'egp',
  leadConversionRate: 'percent',
  conversationToLeadRate: 'percent',
  orders: 'count',
  cpa: 'egp',
  leadToOrderRate: 'percent',
  revenue: 'egp',
  roas: 'multiple',
  profit: 'egp',
};

export type MetricsReport = {
  metrics: ComputedMetric[];
  headline: MetricHeadline | null;
};

export function computeMetrics(
  chain: ChainInput,
  delivery: DeliveryInput,
  objective: CampaignObjectiveId | null,
): MetricsReport {
  const primary = new Set(objective ? PRIMARY[objective] : BUSINESS_PRIMARY);
  const headlineOrder = objective ? PRIMARY[objective] : BUSINESS_PRIMARY;
  const metrics = CATALOG.map((id) =>
    metric(id, chain, delivery, primary.has(id)),
  );
  const headline =
    headlineOrder
      .map((id) => metrics.find((item) => item.id === id))
      .find((item) => item != null && item.value != null) ?? null;

  return {
    metrics,
    headline:
      headline && headline.value != null
        ? { id: headline.id, value: headline.value, unit: headline.unit }
        : null,
  };
}

function metric(
  id: MetricId,
  chain: ChainInput,
  delivery: DeliveryInput,
  primary: boolean,
): ComputedMetric {
  const solved = solve(id, chain, delivery);
  return {
    id,
    value: solved.value,
    unit: UNITS[id],
    gap: solved.gap,
    primary,
  };
}

function solve(
  id: MetricId,
  chain: ChainInput,
  delivery: DeliveryInput,
): { value: number | null; gap: MetricGap | null } {
  switch (id) {
    case 'reach':
      return countOrMissing(delivery.reach, 'missing_reach');
    case 'impressions':
      return countOrMissing(delivery.impressions, 'missing_impressions');
    case 'clicks':
      return countOrMissing(delivery.clicks, 'missing_clicks');
    case 'landingPageViews':
      return countOrMissing(
        delivery.landingPageViews,
        'missing_landing_page_views',
      );
    case 'engagements':
      return countOrMissing(delivery.engagements, 'missing_engagements');
    case 'conversations':
      return { value: chain.conversations, gap: null };
    case 'leads':
      return { value: chain.leads, gap: null };
    case 'orders':
      return { value: chain.orders, gap: null };
    case 'revenue':
      return { value: roundTo(chain.revenueEgp, 1), gap: null };
    case 'frequency':
      return divide(delivery.impressions, delivery.reach, 2, {
        missingNumerator: 'missing_impressions',
        missingDenominator: 'missing_reach',
      });
    case 'ctr':
      return percent(delivery.clicks, delivery.impressions, {
        missingNumerator: 'missing_clicks',
        missingDenominator: 'missing_impressions',
      });
    case 'cpc':
      return per(delivery.spendEgp, delivery.clicks, 'missing_clicks');
    case 'cpm':
      return perThousand(delivery.spendEgp, delivery.impressions);
    case 'engagementRate':
      return percent(delivery.engagements, delivery.impressions, {
        missingNumerator: 'missing_engagements',
        missingDenominator: 'missing_impressions',
      });
    case 'costPerEngagement':
      return per(
        delivery.spendEgp,
        delivery.engagements,
        'missing_engagements',
      );
    case 'costPerConversation':
      return per(delivery.spendEgp, chain.conversations, null);
    case 'cpl':
      return per(delivery.spendEgp, chain.leads, null);
    case 'cpa':
      return per(delivery.spendEgp, chain.orders, null);
    case 'leadConversionRate':
      return percent(chain.leads, delivery.clicks, {
        missingNumerator: null,
        missingDenominator: 'missing_clicks',
      });
    case 'conversationToLeadRate':
      return percent(chain.leads, chain.conversations, {
        missingNumerator: null,
        missingDenominator: null,
      });
    case 'leadToOrderRate':
      return percent(chain.orders, chain.leads, {
        missingNumerator: null,
        missingDenominator: null,
      });
    case 'roas':
      if (delivery.spendEgp == null) {
        return { value: null, gap: 'missing_spend' };
      }
      return divide(chain.revenueEgp, delivery.spendEgp, 2, {
        missingNumerator: null,
        missingDenominator: 'missing_spend',
      });
    case 'profit':
      if (delivery.spendEgp == null) {
        return { value: null, gap: 'missing_spend' };
      }
      if (chain.costOfGoodsEgp == null) {
        return { value: null, gap: 'missing_cost' };
      }
      if (chain.shippingEgp == null || chain.returnShippingEgp == null) {
        return { value: null, gap: 'missing_shipping' };
      }
      return {
        value: roundTo(
          chain.revenueEgp -
            delivery.spendEgp -
            chain.costOfGoodsEgp -
            chain.shippingEgp -
            chain.returnShippingEgp,
          1,
        ),
        gap: null,
      };
    default:
      return { value: null, gap: null };
  }
}

function countOrMissing(
  value: number | null,
  gap: MetricGap,
): { value: number | null; gap: MetricGap | null } {
  if (value == null) return { value: null, gap };
  return { value, gap: null };
}

function per(
  spend: number | null,
  count: number | null,
  missingCount: MetricGap | null,
): { value: number | null; gap: MetricGap | null } {
  if (spend == null) return { value: null, gap: 'missing_spend' };
  if (count == null) {
    return { value: null, gap: missingCount ?? 'divide_by_zero' };
  }
  return divide(spend, count, 1, {
    missingNumerator: 'missing_spend',
    missingDenominator: missingCount,
  });
}

function perThousand(
  spend: number | null,
  impressions: number | null,
): { value: number | null; gap: MetricGap | null } {
  if (spend == null) return { value: null, gap: 'missing_spend' };
  if (impressions == null) return { value: null, gap: 'missing_impressions' };
  if (impressions === 0) return { value: null, gap: 'divide_by_zero' };
  return { value: roundTo((spend / impressions) * 1000, 1), gap: null };
}

function percent(
  part: number | null,
  whole: number | null,
  missing: {
    missingNumerator: MetricGap | null;
    missingDenominator: MetricGap | null;
  },
): { value: number | null; gap: MetricGap | null } {
  if (whole == null && missing.missingDenominator) {
    return { value: null, gap: missing.missingDenominator };
  }
  if (part == null && missing.missingNumerator) {
    return { value: null, gap: missing.missingNumerator };
  }
  if (part == null || whole == null || whole === 0) {
    return { value: null, gap: 'divide_by_zero' };
  }
  return { value: roundTo((part / whole) * 100, 1), gap: null };
}

function divide(
  numerator: number | null,
  denominator: number | null,
  digits: number,
  missing: {
    missingNumerator: MetricGap | null;
    missingDenominator: MetricGap | null;
  },
): { value: number | null; gap: MetricGap | null } {
  if (numerator == null && missing.missingNumerator) {
    return { value: null, gap: missing.missingNumerator };
  }
  if (denominator == null && missing.missingDenominator) {
    return { value: null, gap: missing.missingDenominator };
  }
  if (numerator == null || denominator == null || denominator === 0) {
    return { value: null, gap: 'divide_by_zero' };
  }
  return { value: roundTo(numerator / denominator, digits), gap: null };
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
