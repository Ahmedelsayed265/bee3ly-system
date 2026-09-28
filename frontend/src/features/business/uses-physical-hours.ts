import type { BusinessType } from '@/features/business/api';

/** In-person venues (branch hours). Online-first types use payment/FAQs only. */
const PHYSICAL_HOURS_TYPES: ReadonlySet<BusinessType> = new Set([
  'RESTAURANT',
  'CAFE',
  'BEAUTY',
  'REAL_ESTATE',
  'OTHER',
]);

export function businessUsesPhysicalHours(
  type: BusinessType | null | undefined,
): boolean {
  if (!type) return false;
  return PHYSICAL_HOURS_TYPES.has(type);
}
