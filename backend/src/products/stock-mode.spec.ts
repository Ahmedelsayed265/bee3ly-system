import { inStockForVariants } from './stock-mode';

describe('inStockForVariants', () => {
  it('keeps a restaurant listing available even when variant quantities are zero', () => {
    expect(
      inStockForVariants({
        type: 'RESTAURANT',
        totalStock: 0,
        inStock: true,
      }),
    ).toBe(true);
    expect(
      inStockForVariants({
        type: 'CAFE',
        totalStock: 0,
        inStock: false,
      }),
    ).toBe(false);
  });

  it('treats a physical product as available only when variant stock is above zero', () => {
    expect(
      inStockForVariants({ type: 'FASHION', totalStock: 0, inStock: true }),
    ).toBe(false);
    expect(
      inStockForVariants({ type: 'FASHION', totalStock: 3, inStock: false }),
    ).toBe(true);
  });
});
