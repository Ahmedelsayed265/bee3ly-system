export const OBJECTIVES = [
  'AWARENESS',
  'TRAFFIC',
  'ENGAGEMENT',
  'MORE_MESSAGES',
  'MORE_LEADS',
  'MORE_BOOKINGS',
  'MORE_ORDERS',
  'RETARGETING',
] as const;

export type CampaignObjective = (typeof OBJECTIVES)[number];
