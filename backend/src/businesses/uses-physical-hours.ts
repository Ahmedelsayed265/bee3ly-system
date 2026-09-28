import type { BusinessType } from '@prisma/client';

const PHYSICAL_HOURS_TYPES: ReadonlySet<BusinessType> = new Set([
  'RESTAURANT',
  'CAFE',
  'BEAUTY',
  'REAL_ESTATE',
  'OTHER',
]);

export function businessUsesPhysicalHours(type: BusinessType): boolean {
  return PHYSICAL_HOURS_TYPES.has(type);
}
