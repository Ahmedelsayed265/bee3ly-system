export const LEAD_STATUSES = ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEADS_PAGE_SIZE = 9;

export type Lead = {
  id: string;
  status: string;
  intent: string | null;
  createdAt: string;
  customer: { name: string | null; phone: string | null };
};

export type PendingLeadStatus = {
  id: string;
  customer: string;
  status: LeadStatus;
};
