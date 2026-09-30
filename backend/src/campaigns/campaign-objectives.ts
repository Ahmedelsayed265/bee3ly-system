import { CampaignObjective } from '@prisma/client';

const PRIMARY_ORDER: CampaignObjective[] = [
  'MORE_ORDERS',
  'RETARGETING',
  'MORE_LEADS',
  'MORE_BOOKINGS',
  'MORE_MESSAGES',
  'TRAFFIC',
  'ENGAGEMENT',
  'AWARENESS',
];

export function pickPrimaryObjective(
  objectives: CampaignObjective[],
): CampaignObjective {
  for (const id of PRIMARY_ORDER) {
    if (objectives.includes(id)) return id;
  }
  return objectives[0] ?? 'MORE_ORDERS';
}

export function normalizeCampaignObjectives(input: {
  objectives?: CampaignObjective[];
  objective?: CampaignObjective;
}): { objectives: CampaignObjective[]; primary: CampaignObjective } {
  const raw =
    input.objectives?.length && input.objectives.length > 0
      ? input.objectives
      : input.objective
        ? [input.objective]
        : ['MORE_ORDERS'];

  const objectives = [...new Set(raw)] as CampaignObjective[];
  return { objectives, primary: pickPrimaryObjective(objectives) };
}

export function campaignGoalsList(campaign: {
  objective: CampaignObjective;
  objectives?: CampaignObjective[];
}): CampaignObjective[] {
  if (campaign.objectives?.length) return campaign.objectives;
  return [campaign.objective];
}
