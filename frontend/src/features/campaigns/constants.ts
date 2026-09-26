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

export const AUDIENCES = [
  'NEARBY',
  'INTERESTED',
  'ENGAGED',
  'MESSAGED',
  'CUSTOMERS',
  'SIMILAR',
] as const;

export type CampaignAudience = (typeof AUDIENCES)[number];
