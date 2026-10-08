import { createHash } from 'crypto';
import type { CampaignObjective } from '@prisma/client';

const CURRENCY_OFFSET: Record<string, number> = {
  EGP: 100,
  USD: 100,
  EUR: 100,
  SAR: 100,
  AED: 100,
  JPY: 1,
};

const MIN_DAILY_MAJOR: Record<string, number> = {
  EGP: 50,
  USD: 1,
  EUR: 1,
};

export function currencyOffset(currency: string) {
  return CURRENCY_OFFSET[currency.toUpperCase()] ?? 100;
}

/** Major units (wizard budget) -> Meta minor units. */
export function dailyBudgetMinor(budgetMajor: number, currency: string) {
  const offset = currencyOffset(currency);
  const minor = Math.round(budgetMajor * offset);
  const minMajor = MIN_DAILY_MAJOR[currency.toUpperCase()] ?? 1;
  if (budgetMajor < minMajor) {
    throw new Error(
      `Daily budget ${budgetMajor} ${currency} is below the minimum ${minMajor}`,
    );
  }
  return minor;
}

export function mapObjective(objective: CampaignObjective): {
  objective: string;
  optimizationGoal: string;
  billingEvent: string;
  messaging: boolean;
} {
  switch (objective) {
    case 'TRAFFIC':
      return {
        objective: 'OUTCOME_TRAFFIC',
        optimizationGoal: 'LINK_CLICKS',
        billingEvent: 'IMPRESSIONS',
        messaging: false,
      };
    case 'MORE_LEADS':
    case 'MORE_BOOKINGS':
      return {
        objective: 'OUTCOME_LEADS',
        optimizationGoal: 'LEAD_GENERATION',
        billingEvent: 'IMPRESSIONS',
        messaging: false,
      };
    case 'MORE_MESSAGES':
    case 'RETARGETING':
      return {
        objective: 'OUTCOME_ENGAGEMENT',
        optimizationGoal: 'CONVERSATIONS',
        billingEvent: 'IMPRESSIONS',
        messaging: true,
      };
    case 'AWARENESS':
      return {
        objective: 'OUTCOME_AWARENESS',
        optimizationGoal: 'REACH',
        billingEvent: 'IMPRESSIONS',
        messaging: false,
      };
    case 'ENGAGEMENT':
      return {
        objective: 'OUTCOME_ENGAGEMENT',
        optimizationGoal: 'POST_ENGAGEMENT',
        billingEvent: 'IMPRESSIONS',
        messaging: false,
      };
    case 'MORE_ORDERS':
    default:
      return {
        objective: 'OUTCOME_SALES',
        optimizationGoal: 'OFFSITE_CONVERSIONS',
        billingEvent: 'IMPRESSIONS',
        messaging: false,
      };
  }
}

export function destinationType(channel: string | null | undefined) {
  const value = (channel ?? 'FACEBOOK_INSTAGRAM').toUpperCase();
  if (value.includes('WHATSAPP')) return 'WHATSAPP';
  if (value.includes('INSTAGRAM')) return 'INSTAGRAM_DIRECT';
  return 'MESSENGER';
}

/** Digits only, Egypt local 01… -> 20…. */
export function normalizeE164Digits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `20${digits.slice(1)}`;
  return digits;
}

export function sha256Phone(phone: string): string | null {
  const normalized = normalizeE164Digits(phone);
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}

export function hashPhones(phones: string[]) {
  const hashes = new Set<string>();
  for (const phone of phones) {
    const hash = sha256Phone(phone);
    if (hash) hashes.add(hash);
  }
  return [...hashes];
}

export function extractMetaAdId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const message =
    root.message && typeof root.message === 'object'
      ? (root.message as Record<string, unknown>)
      : root;
  const referral =
    (message.referral as Record<string, unknown> | undefined) ??
    (root.referral as Record<string, unknown> | undefined);
  if (!referral) return null;
  const adId =
    referral.ad_id ?? referral.source_id ?? referral.ads_context_data;
  if (typeof adId === 'string' && adId.trim()) return adId.trim();
  if (adId && typeof adId === 'object') {
    const nested = (adId as Record<string, unknown>).ad_id;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return null;
}

export function isCustomAudienceTermsError(error: unknown) {
  const text = errorText(error).toLowerCase();
  return text.includes('custom audience') && text.includes('terms');
}

export function isTokenError(error: unknown) {
  const text = errorText(error);
  return /"code"\s*:\s*190\b/.test(text) || text.includes('code":190');
}

export function metaUserMessage(error: unknown) {
  const text = errorText(error);
  try {
    const json = JSON.parse(text) as {
      error?: { error_user_msg?: string; message?: string };
    };
    return (
      json.error?.error_user_msg || json.error?.message || text.slice(0, 400)
    );
  } catch {
    return text.slice(0, 400);
  }
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error ?? '');
}
