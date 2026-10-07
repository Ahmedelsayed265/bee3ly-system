import type { PublicPlan } from './plans';

export const GB = 1_000_000_000;

/** Customer-facing AI action weights. Internal multipliers can change later. */
export const AI_ACTION_WEIGHTS = {
  simpleReply: 1,
  conversationSummary: 2,
  productAnalysis: 5,
  complexTask: 5,
} as const;

export type PlanFeatures = {
  inbox: boolean;
  whatsapp: boolean;
  instagram: boolean;
  facebook: boolean;
  tiktok: boolean;
  adsManagement: boolean;
  adsMutate: boolean;
  advancedAnalytics: boolean;
  automation: boolean;
  ai: boolean;
  api: boolean;
  exports: 'basic' | 'yes' | 'advanced';
  prioritySupport: boolean;
  team: boolean;
};

export type PlanLimits = {
  socialChannels: number;
  whatsappNumbers: number;
  teamMembers: number;
  products: number;
  ordersPerMonth: number;
  conversationsPerMonth: number;
  whatsappMessages: number;
  activeCampaigns: number;
  adAccounts: number;
  automations: number;
  aiActions: number;
  apiRequestsPerDay: number;
  apiRequestsPerMinute: number;
  storageBytes: number;
  /** Set only when a platform has a tighter cap than the social-channel total. */
  facebookPages?: number;
  instagramAccounts?: number;
  tiktokAccounts?: number;
};

const starterFeatures: PlanFeatures = {
  inbox: true,
  whatsapp: true,
  instagram: true,
  facebook: true,
  tiktok: true,
  adsManagement: true,
  adsMutate: true,
  advancedAnalytics: false,
  automation: true,
  ai: true,
  api: false,
  exports: 'basic',
  prioritySupport: false,
  team: true,
};

const growthFeatures: PlanFeatures = {
  ...starterFeatures,
  advancedAnalytics: true,
  api: true,
  exports: 'yes',
};

const proFeatures: PlanFeatures = {
  ...growthFeatures,
  exports: 'advanced',
  prioritySupport: true,
};

export const PLAN_LIMITS: Record<PublicPlan, PlanLimits> = {
  STARTER: {
    socialChannels: 2,
    whatsappNumbers: 1,
    teamMembers: 2,
    products: 500,
    ordersPerMonth: 500,
    conversationsPerMonth: 2_000,
    whatsappMessages: 500,
    activeCampaigns: 5,
    adAccounts: 1,
    automations: 5,
    aiActions: 100,
    apiRequestsPerDay: 0,
    apiRequestsPerMinute: 60,
    storageBytes: 2 * GB,
  },
  GROWTH: {
    socialChannels: 5,
    whatsappNumbers: 2,
    teamMembers: 5,
    products: 2_500,
    ordersPerMonth: 2_500,
    conversationsPerMonth: 10_000,
    whatsappMessages: 2_000,
    activeCampaigns: 25,
    adAccounts: 3,
    automations: 25,
    aiActions: 500,
    apiRequestsPerDay: 1_000,
    apiRequestsPerMinute: 120,
    storageBytes: 10 * GB,
  },
  PRO: {
    socialChannels: 10,
    whatsappNumbers: 5,
    teamMembers: 15,
    products: 10_000,
    ordersPerMonth: 10_000,
    conversationsPerMonth: 30_000,
    whatsappMessages: 5_000,
    activeCampaigns: 100,
    adAccounts: 10,
    automations: 100,
    aiActions: 2_000,
    apiRequestsPerDay: 10_000,
    apiRequestsPerMinute: 300,
    storageBytes: 50 * GB,
  },
};

export const PLAN_FEATURES: Record<PublicPlan, PlanFeatures> = {
  STARTER: starterFeatures,
  GROWTH: growthFeatures,
  PRO: proFeatures,
};

/** Growth-like access with deliberately small usage. No API. */
export const TRIAL_LIMITS: PlanLimits = {
  socialChannels: 2,
  whatsappNumbers: 1,
  teamMembers: 2,
  products: 500,
  ordersPerMonth: 100,
  conversationsPerMonth: 1_000,
  whatsappMessages: 100,
  activeCampaigns: 3,
  adAccounts: 1,
  automations: 5,
  aiActions: 50,
  apiRequestsPerDay: 0,
  apiRequestsPerMinute: 0,
  storageBytes: 2 * GB,
  facebookPages: 1,
  instagramAccounts: 1,
  tiktokAccounts: 0,
};

export const TRIAL_FEATURES: PlanFeatures = {
  ...growthFeatures,
  api: false,
  prioritySupport: false,
  exports: 'basic',
};

export function usageLevel(used: number, limit: number): 0 | 70 | 90 | 100 {
  if (limit <= 0) return used > 0 ? 100 : 0;
  const ratio = used / limit;
  if (ratio >= 1) return 100;
  if (ratio >= 0.9) return 90;
  if (ratio >= 0.7) return 70;
  return 0;
}
