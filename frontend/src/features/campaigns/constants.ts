export const OBJECTIVES = [
  'MORE_ORDERS',
  'MORE_LEADS',
  'MORE_BOOKINGS',
  'MORE_MESSAGES',
] as const;

export type CampaignObjective = (typeof OBJECTIVES)[number];
