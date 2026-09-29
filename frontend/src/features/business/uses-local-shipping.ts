import type { BusinessType } from '@/features/business/api';

const LOCAL_SHIPPING_TYPES: ReadonlySet<BusinessType> = new Set([
  'RESTAURANT',
  'CAFE',
]);

export function businessAllowsLocalShipping(
  type: BusinessType | null | undefined,
): boolean {
  if (!type) return false;
  return LOCAL_SHIPPING_TYPES.has(type);
}
