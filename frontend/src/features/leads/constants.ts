export const LEAD_STATUSES = ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEADS_PAGE_SIZE = 9;

export type LeadCounts = Record<LeadStatus, number>;

export const EMPTY_LEAD_COUNTS: LeadCounts = {
  NEW: 0,
  QUALIFIED: 0,
  CONVERTED: 0,
  LOST: 0,
};

export type Lead = {
  id: string;
  status: string;
  intent: string | null;
  createdAt: string;
  customer: { name: string | null; phone: string | null };
  campaign?: { id: string; name: string } | null;
};

export type PendingLeadStatus = {
  id: string;
  customer: string;
  status: LeadStatus;
};
