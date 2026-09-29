import type { BusinessType } from '@prisma/client';

const LOCAL_SHIPPING_TYPES: ReadonlySet<BusinessType> = new Set([
  'RESTAURANT',
  'CAFE',
]);

export function businessAllowsLocalShipping(type: BusinessType | string): boolean {
  return LOCAL_SHIPPING_TYPES.has(type as BusinessType);
}

export function effectiveShippingPricingMode(
  type: BusinessType | string,
  mode: string,
): 'GOVERNORATE' | 'LOCAL_AREA' {
  if (businessAllowsLocalShipping(type) && mode === 'LOCAL_AREA') {
    return 'LOCAL_AREA';
  }
  return 'GOVERNORATE';
}
