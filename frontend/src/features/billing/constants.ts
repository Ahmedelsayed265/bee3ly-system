import type { PlanTier } from '@/features/business/api';
import type { MessageKey } from '@/features/i18n/messages';

export const BILLING_PLANS: Array<{
  id: PlanTier;
  priceKey: MessageKey;
  featureKeys: MessageKey[];
  highlight?: boolean;
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
];
