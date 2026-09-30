import type { BusinessType } from '@prisma/client';

const LOCAL_SHIPPING_TYPES: ReadonlySet<BusinessType> = new Set([
  'RESTAURANT',
  'CAFE',
]);

export function businessAllowsLocalShipping(type: string): boolean {
  return LOCAL_SHIPPING_TYPES.has(type as BusinessType);
}

export function effectiveShippingPricingMode(
  type: string,
  mode: string,
): 'GOVERNORATE' | 'LOCAL_AREA' {
  if (businessAllowsLocalShipping(type) && mode === 'LOCAL_AREA') {
    return 'LOCAL_AREA';
  }
  return 'GOVERNORATE';
}
