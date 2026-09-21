/** Physical units (t-shirts, bottles…) track a count. Made-to-order / listings use available/unavailable. */
export function usesQuantityStock(type: string): boolean {
  return type !== 'REAL_ESTATE' && type !== 'RESTAURANT' && type !== 'CAFE';
}

export function resolveInStock(input: {
  type: string;
  stockQuantity?: number | null;
  inStock?: boolean;
}): { stockQuantity: number | null; inStock: boolean } {
  if (usesQuantityStock(input.type)) {
    const qty = Math.max(0, Math.floor(Number(input.stockQuantity ?? 0)));
    return { stockQuantity: qty, inStock: qty > 0 };
  }
  return {
    stockQuantity: null,
    inStock: input.inStock ?? true,
  };
}

export function isAvailable(product: {
  inStock: boolean;
  stockQuantity?: number | null;
}): boolean {
  if (product.stockQuantity != null) return product.stockQuantity > 0;
  return product.inStock;
}
