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

export function campaignGoalsList(campaign: {
  objective: CampaignObjective | string;
  objectives?: (CampaignObjective | string)[] | null;
}): CampaignObjective[] {
  if (campaign.objectives?.length) {
    return campaign.objectives as CampaignObjective[];
  }
  return [campaign.objective as CampaignObjective];
}

export function toggleCampaignObjective(
  selected: CampaignObjective[],
  goal: CampaignObjective,
): CampaignObjective[] {
  if (selected.includes(goal)) {
    return selected.length > 1 ? selected.filter((g) => g !== goal) : selected;
  }
  return [...selected, goal];
}

export const AUDIENCES = [
  'NEARBY',
  'INTERESTED',
  'ENGAGED',
  'MESSAGED',
  'CUSTOMERS',
  'SIMILAR',
] as const;

export type CampaignAudience = (typeof AUDIENCES)[number];

export function campaignAudienceList(campaign: {
  audienceDescription: string;
  audiences?: (CampaignAudience | string)[] | null;
}): CampaignAudience[] {
  if (campaign.audiences?.length) {
    return campaign.audiences.filter((a): a is CampaignAudience =>
      (AUDIENCES as readonly string[]).includes(a),
    );
  }
  return [];
}

export function toggleCampaignAudience(
  selected: CampaignAudience[],
  segment: CampaignAudience,
): CampaignAudience[] {
  if (selected.includes(segment)) {
    return selected.length > 1
      ? selected.filter((a) => a !== segment)
      : selected;
  }
  return [...selected, segment];
}
